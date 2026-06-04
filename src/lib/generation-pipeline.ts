/**
 * Step-based generation pipeline.
 *
 * Each step runs in its own Vercel function invocation (fan-out architecture)
 * so we never bump against the per-function 300s timeout on the Hobby plan.
 *
 *   Orchestrator → Enhancement worker → N parallel Roof workers
 *                                            ↓ (last one in)
 *                                     Make.com webhook
 *
 * State lives in Redis (see `kv.ts` GenMeta / GenJobResult). Each worker
 * decrements an atomic counter; the worker that drives it to zero
 * aggregates all results, persists them, and notifies Make.com.
 */

import { COLORS, getColorReferenceUrl } from "@/lib/colors";
import {
  getEnhancementPrompt,
  getWaveTilePrompt,
  getStandingSeamPrompt,
  getShingleTilePrompt,
} from "@/lib/prompts";
import { createTask, pollTaskResult } from "@/lib/kie-ai";
import {
  ClientCodeColorResult,
  ClientCodeResults,
  setCodeResults,
  remainingTtlSeconds,
  getCodeMeta,
  setGenMeta,
  getGenMeta,
  setGenEnhancedUrl,
  setGenJobResult,
  setGenCounter,
  decrementGenCounter,
  setGenJobsList,
  getAllGenJobResults,
  GenJobSpec,
  GenJobResult,
} from "@/lib/kv";
import type { RoofStyle } from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────

/** Per-task poll timeout sent to Kie.ai (lower than function maxDuration). */
const KIE_POLL_TIMEOUT_MS = 220_000;

/**
 * Random delay before each worker's first call to Kie.ai. Spreads the
 * fan-out so we stay below Kie.ai's "20 new tasks / 10 seconds" rate limit
 * even when multiple clients trigger generations at the same time.
 */
const FAN_OUT_JITTER_MAX_MS = 2_000;

/** Backoff schedule used when Kie.ai returns a 429 — try a few times spaced out. */
const RATE_LIMIT_BACKOFFS_MS = [5_000, 12_000, 25_000];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b/.test(msg) || /rate ?limit/i.test(msg);
}

/**
 * Build the list of (color × style) jobs to run. Matches the user's
 * selections from the client portal. Silently drops any color key that's no
 * longer in COLORS (e.g. legacy code with a since-removed colorKey) so an
 * in-flight code from before a palette change still partially completes.
 */
function buildJobs(
  selectedColors: string[],
  selectedStyles: RoofStyle[]
): GenJobSpec[] {
  const out: GenJobSpec[] = [];
  for (const colorKey of selectedColors) {
    if (!COLORS[colorKey]) {
      console.warn(`[gen] dropping unknown colorKey: ${colorKey}`);
      continue;
    }
    for (const roofStyle of selectedStyles) {
      out.push({
        jobKey: `${colorKey}:${roofStyle}`,
        colorKey,
        roofStyle,
      });
    }
  }
  return out;
}

/**
 * Build the inputs (prompt + image URLs to pass to Kie.ai) for a given
 * (style, color) job. The first image is always the house source; any
 * extra images are color/style references appended after.
 */
function jobInputs(
  roofStyle: RoofStyle,
  colorKey: string,
  sourceUrl: string,
  publicBaseUrl: string | undefined
): { prompt: string; imageUrls: string[] } {
  const color = COLORS[colorKey];
  if (!color) throw new Error(`Couleur inconnue: ${colorKey}`);

  let prompt: string;
  if (roofStyle === "wave_tile") prompt = getWaveTilePrompt(color);
  else if (roofStyle === "standing_seam") prompt = getStandingSeamPrompt(color);
  else prompt = getShingleTilePrompt(color);

  const refUrl = getColorReferenceUrl(color, publicBaseUrl);
  const imageUrls = refUrl ? [sourceUrl, refUrl] : [sourceUrl];

  return { prompt, imageUrls };
}

/**
 * Run one Kie.ai task with retry. Two distinct retry paths:
 *   - 429 (rate limit) → up to 3 retries with exponential backoff
 *   - any other error → 1 retry, immediate
 *
 * Total worst-case time for 429: ~5s + 12s + 25s + 4 × 90s task time = ~7 min.
 * Single roof worker runs in 300s budget, so 429 retries fit if Kie.ai
 * cools off quickly. Otherwise the job fails gracefully and shows up as
 * "partial" in the Make payload.
 */
async function runOneTaskWithRetry(
  prompt: string,
  imageUrls: string[]
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  let rateLimitTries = 0;
  let otherTries = 0;
  let lastErr: unknown = null;

  for (;;) {
    try {
      const taskId = await createTask(prompt, imageUrls);
      const urls = await pollTaskResult(taskId, KIE_POLL_TIMEOUT_MS);
      if (urls[0]) return { ok: true, url: urls[0] };
      throw new Error("Aucune image retournée");
    } catch (err) {
      lastErr = err;

      if (isRateLimitError(err)) {
        const backoff = RATE_LIMIT_BACKOFFS_MS[rateLimitTries];
        if (backoff === undefined) break; // exhausted
        console.warn(
          `[gen] Kie.ai 429 — backing off ${backoff}ms before retry #${rateLimitTries + 1}`
        );
        await sleep(backoff);
        rateLimitTries++;
        continue;
      }

      if (otherTries < 1) {
        otherTries++;
        console.warn("[gen] task failed, retrying once:", err);
        continue;
      }
      break;
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : "Erreur inconnue";
  return { ok: false, error: msg };
}

// ─── ENTRY POINT 1: Orchestrator (fast) ───────────────────────────────────

interface KickoffParams {
  code: string;
  sourceImageUrl: string;
  selectedColors: string[];
  selectedStyles: RoofStyle[];
  resultsBaseUrl: string;
  internalBaseUrl: string;
}

/**
 * Set up Redis state for this generation and fire the enhancement worker.
 * Returns immediately — the heavy work happens in subsequent function calls.
 */
export async function kickoffGeneration(params: KickoffParams): Promise<void> {
  const { code, sourceImageUrl, selectedColors, selectedStyles } = params;

  const jobs = buildJobs(selectedColors, selectedStyles);
  if (jobs.length === 0) {
    console.warn("[gen] no jobs to run for code", code);
    return;
  }

  // Persist the spec
  await setGenMeta({
    code,
    sourceImageUrl,
    jobs,
    resultsBaseUrl: params.resultsBaseUrl,
    startedAt: Date.now(),
  });
  await setGenJobsList(
    code,
    jobs.map((j) => j.jobKey)
  );
  await setGenCounter(code, jobs.length);

  // Fire the enhancement worker — it'll fan out the roof jobs after itself.
  await fireWorker(`${params.internalBaseUrl}/api/internal/run-enhancement`, {
    code,
    internalBaseUrl: params.internalBaseUrl,
  });
}

// ─── ENTRY POINT 2: Enhancement worker ─────────────────────────────────────

/**
 * Run the enhancement Kie.ai task for `code`, persist the result, then fan
 * out N parallel roof-job workers. Designed to be called via internal HTTP.
 */
export async function runEnhancementStep(
  code: string,
  internalBaseUrl: string
): Promise<void> {
  const meta = await getGenMeta(code);
  if (!meta) {
    console.error("[gen] no meta for code", code);
    return;
  }

  let enhancedUrl = meta.sourceImageUrl;
  try {
    const result = await runOneTaskWithRetry(
      getEnhancementPrompt(),
      [meta.sourceImageUrl]
    );
    if (result.ok) enhancedUrl = result.url;
  } catch (err) {
    console.error("[gen] enhancement crashed, using original:", err);
  }

  await setGenEnhancedUrl(code, enhancedUrl);

  // Fan out roof workers (fire-and-forget — each is its own function)
  await Promise.all(
    meta.jobs.map((job) =>
      fireWorker(`${internalBaseUrl}/api/internal/run-roof-job`, {
        code,
        jobKey: job.jobKey,
      })
    )
  );
}

// ─── ENTRY POINT 3: Roof-job worker ─────────────────────────────────────────

/**
 * Run one (color × style) Kie.ai task, persist its result, decrement the
 * counter, and if we're the last one — aggregate everything and notify Make.
 */
export async function runRoofJobStep(
  code: string,
  jobKey: string
): Promise<void> {
  const meta = await getGenMeta(code);
  if (!meta) {
    console.error("[gen] no meta for code", code);
    return;
  }

  const job = meta.jobs.find((j) => j.jobKey === jobKey);
  if (!job) {
    console.error("[gen] unknown jobKey", jobKey);
    return;
  }

  // Spread the fan-out across a couple of seconds so we stay under
  // Kie.ai's "20 new tasks / 10 seconds" rate limit, even when several
  // clients are generating simultaneously.
  await sleep(Math.floor(Math.random() * FAN_OUT_JITTER_MAX_MS));

  const sourceUrl = meta.enhancedImageUrl || meta.sourceImageUrl;
  let result: GenJobResult;
  try {
    const { prompt, imageUrls } = jobInputs(
      job.roofStyle,
      job.colorKey,
      sourceUrl,
      meta.resultsBaseUrl
    );
    const r = await runOneTaskWithRetry(prompt, imageUrls);
    result = r.ok
      ? { jobKey, ok: true, url: r.url }
      : { jobKey, ok: false, error: r.error };
  } catch (err) {
    result = {
      jobKey,
      ok: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }

  await setGenJobResult(code, result);

  // Atomically decrement — whoever drives the counter to 0 finalizes.
  const remaining = await decrementGenCounter(code);
  if (remaining <= 0) {
    await finalizeAndNotify(code);
  }
}

// ─── Finalization + Make webhook ───────────────────────────────────────────

interface MakeCompletionPayload {
  code: string;
  clientName: string;
  firstName: string;
  phoneNumber: string;
  email: string | null;
  resultsUrl: string;
  imageCount: number;
  successCount: number;
  failureCount: number;
  status: "completed" | "partial" | "failed";
  completedAt: string;
}

async function finalizeAndNotify(code: string): Promise<void> {
  const [meta, codeMeta, allResults] = await Promise.all([
    getGenMeta(code),
    getCodeMeta(code),
    getAllGenJobResults(code),
  ]);
  if (!meta || !codeMeta) {
    console.error("[gen] missing meta during finalize for", code);
    return;
  }

  // Aggregate per-color
  const byColor = new Map<string, ClientCodeColorResult>();
  for (const r of allResults) {
    if (!r.ok || !r.url) continue;
    const job = meta.jobs.find((j) => j.jobKey === r.jobKey);
    if (!job) continue;
    let entry = byColor.get(job.colorKey);
    if (!entry) {
      entry = { colorKey: job.colorKey };
      byColor.set(job.colorKey, entry);
    }
    if (job.roofStyle === "wave_tile") entry.waveTileUrl = r.url;
    else if (job.roofStyle === "standing_seam") entry.standingSeamUrl = r.url;
    else entry.shingleTileUrl = r.url;
  }

  const aggregated = Array.from(byColor.values());
  const successCount = allResults.filter((r) => r.ok).length;
  const failureCount = allResults.length - successCount;

  // Persist final results in the legacy KV shape so /client/[code] page
  // can render them when the client comes back via SMS/email.
  if (aggregated.length > 0) {
    const completedResults: ClientCodeResults = {
      enhancedImageUrl: meta.enhancedImageUrl || meta.sourceImageUrl,
      originalImageUrl: meta.sourceImageUrl,
      results: aggregated,
      completedAt: Date.now(),
    };
    try {
      const ttl = remainingTtlSeconds(codeMeta.expiresAt);
      await setCodeResults(code, completedResults, ttl);
    } catch (err) {
      console.error("[gen] failed to persist final results:", err);
    }
  }

  // Build Make payload
  let status: MakeCompletionPayload["status"];
  if (successCount === 0) status = "failed";
  else if (failureCount === 0) status = "completed";
  else status = "partial";

  const firstName = (codeMeta.clientName || "").split(/\s+/)[0] || "client";
  const payload: MakeCompletionPayload = {
    code,
    clientName: codeMeta.clientName,
    firstName,
    phoneNumber: codeMeta.phoneNumber,
    email: codeMeta.email ?? null,
    resultsUrl: meta.resultsBaseUrl,
    imageCount: meta.jobs.length,
    successCount,
    failureCount,
    status,
    completedAt: new Date().toISOString(),
  };

  const url = process.env.MAKE_COMPLETION_WEBHOOK_URL;
  if (!url) {
    console.warn("[gen] MAKE_COMPLETION_WEBHOOK_URL not set — skipping");
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[gen] Make webhook failed:", res.status, text.slice(0, 200));
    }
  } catch (err) {
    console.error("[gen] Make webhook error:", err);
  }
}

// ─── Internal worker dispatch (fan-out helper) ─────────────────────────────

/**
 * Fire-and-forget POST to an internal worker route. The target route should
 * accept the request quickly and continue the heavy work in `after()`.
 */
async function fireWorker(
  url: string,
  body: Record<string, unknown>
): Promise<void> {
  try {
    const secret = process.env.WEBHOOK_SECRET || "";
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Auth": secret,
      },
      body: JSON.stringify(body),
      // keepalive so the request makes it out even if the parent terminates
      keepalive: true,
    });
  } catch (err) {
    console.error("[gen] worker fire failed for", url, err);
  }
}
