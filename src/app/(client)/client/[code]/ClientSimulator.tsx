"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ColorSelector from "@/components/ColorSelector";
import StyleSelector from "@/components/StyleSelector";
import ProgressPanel from "@/components/ProgressPanel";
import ResultsGallery from "@/components/ResultsGallery";
import DownloadButton from "@/components/DownloadButton";
import type {
  GenerationTask,
  RoofStyle,
} from "@/types";
import type { ClientCodeResults } from "@/lib/kv";

type Phase =
  | "config"
  | "generating"
  | "done"
  | "already_used_pending"
  | "error";

interface Props {
  code: string;
  clientName: string;
  expiresAt: number;
  initialState: "unused" | "used_pending" | "used_completed";
  initialResults: ClientCodeResults | null;
}

interface PersistedState {
  phase: Phase;
  uploadedImageUrl: string | null;
  uploadedImagePreview: string | null;
  enhancedImageUrl: string | null;
  selectedColors: string[];
  selectedStyles: RoofStyle[];
  tasks: GenerationTask[];
}

function storageKey(code: string) {
  return `client-sim:${code}`;
}

function loadPersisted(code: string): PersistedState | null {
  try {
    const raw = localStorage.getItem(storageKey(code));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function savePersisted(code: string, state: PersistedState) {
  try {
    localStorage.setItem(storageKey(code), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function clearPersisted(code: string) {
  try {
    localStorage.removeItem(storageKey(code));
  } catch {
    /* ignore */
  }
}

interface State {
  phase: Phase;
  uploadedImageUrl: string | null;
  uploadedImagePreview: string | null;
  enhancedImageUrl: string | null;
  selectedColors: string[];
  selectedStyles: RoofStyle[];
  tasks: GenerationTask[];
  pdfLoading: boolean;
  error: string | null;
  // For used_completed: shape compatible with download
  completedResults: ClientCodeResults | null;
}

type Action =
  | { type: "SET_PHASE"; phase: Phase }
  | { type: "SET_UPLOAD"; url: string; preview: string }
  | { type: "TOGGLE_COLOR"; key: string }
  | { type: "TOGGLE_STYLE"; style: RoofStyle }
  | { type: "START_GEN"; tasks: GenerationTask[] }
  | { type: "UPDATE_TASK"; index: number; update: Partial<GenerationTask> }
  | { type: "SET_ENHANCED_URL"; url: string }
  | { type: "GEN_DONE"; results: ClientCodeResults }
  | { type: "SET_PDF_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESTORE"; partial: Partial<State> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "SET_UPLOAD":
      return {
        ...state,
        uploadedImageUrl: action.url,
        uploadedImagePreview: action.preview,
      };
    case "TOGGLE_COLOR": {
      const idx = state.selectedColors.indexOf(action.key);
      const next =
        idx >= 0
          ? state.selectedColors.filter((c) => c !== action.key)
          : [...state.selectedColors, action.key];
      return { ...state, selectedColors: next };
    }
    case "TOGGLE_STYLE": {
      const idx = state.selectedStyles.indexOf(action.style);
      const next =
        idx >= 0
          ? state.selectedStyles.filter((s) => s !== action.style)
          : [...state.selectedStyles, action.style];
      return { ...state, selectedStyles: next };
    }
    case "START_GEN":
      return { ...state, phase: "generating", tasks: action.tasks };
    case "UPDATE_TASK": {
      const tasks = [...state.tasks];
      tasks[action.index] = { ...tasks[action.index], ...action.update };
      return { ...state, tasks };
    }
    case "SET_ENHANCED_URL":
      return { ...state, enhancedImageUrl: action.url };
    case "GEN_DONE":
      return { ...state, phase: "done", completedResults: action.results };
    case "SET_PDF_LOADING":
      return { ...state, pdfLoading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "RESTORE":
      return { ...state, ...action.partial };
    default:
      return state;
  }
}

function initialReducerState(props: Props): State {
  if (props.initialState === "used_completed" && props.initialResults) {
    return {
      phase: "done",
      uploadedImageUrl: props.initialResults.originalImageUrl,
      uploadedImagePreview: props.initialResults.originalImageUrl,
      enhancedImageUrl: props.initialResults.enhancedImageUrl,
      selectedColors: [],
      selectedStyles: [],
      tasks: [],
      pdfLoading: false,
      error: null,
      completedResults: props.initialResults,
    };
  }
  return {
    phase: "config",
    uploadedImageUrl: null,
    uploadedImagePreview: null,
    enhancedImageUrl: null,
    selectedColors: [],
    selectedStyles: [],
    tasks: [],
    pdfLoading: false,
    error: null,
    completedResults: null,
  };
}

export default function ClientSimulator(props: Props) {
  const { code, clientName, expiresAt, initialState } = props;
  const [state, dispatch] = useReducer(reducer, props, initialReducerState);
  const enhancedUrlRef = useRef<string | null>(null);
  const [restored, setRestored] = useState(false);

  // ─── Restore from localStorage on mount (if used_pending) ────────────────
  useEffect(() => {
    if (restored) return;
    setRestored(true);

    if (initialState === "used_pending") {
      const persisted = loadPersisted(code);
      if (
        persisted &&
        persisted.phase === "generating" &&
        persisted.uploadedImageUrl &&
        persisted.tasks.length > 0
      ) {
        // Resume — restore state and re-poll any non-success tasks
        enhancedUrlRef.current = persisted.enhancedImageUrl;
        dispatch({
          type: "RESTORE",
          partial: {
            phase: "generating",
            uploadedImageUrl: persisted.uploadedImageUrl,
            uploadedImagePreview: persisted.uploadedImagePreview,
            enhancedImageUrl: persisted.enhancedImageUrl,
            selectedColors: persisted.selectedColors,
            selectedStyles: persisted.selectedStyles,
            tasks: persisted.tasks,
          },
        });
      } else {
        dispatch({ type: "SET_PHASE", phase: "already_used_pending" });
      }
    }
  }, [initialState, code, restored]);

  // ─── Persist state to localStorage during generation ─────────────────────
  useEffect(() => {
    if (state.phase === "generating") {
      savePersisted(code, {
        phase: state.phase,
        uploadedImageUrl: state.uploadedImageUrl,
        uploadedImagePreview: state.uploadedImagePreview,
        enhancedImageUrl: state.enhancedImageUrl,
        selectedColors: state.selectedColors,
        selectedStyles: state.selectedStyles,
        tasks: state.tasks,
      });
    } else if (state.phase === "done") {
      clearPersisted(code);
    }
  }, [code, state.phase, state.uploadedImageUrl, state.uploadedImagePreview, state.enhancedImageUrl, state.selectedColors, state.selectedStyles, state.tasks]);

  // ─── Generation primitives (same as internal simulator) ──────────────────

  const createKieTask = useCallback(
    async (
      imageUrl: string,
      taskType: "enhancement" | "roof",
      colorKey?: string,
      roofStyle?: string
    ): Promise<string> => {
      const res = await fetch("/api/generate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, taskType, colorKey, roofStyle }),
      });
      const data = await res.json();
      if (data.status === "created" && data.taskId) return data.taskId;
      throw new Error(data.error || "Erreur creation tache");
    },
    []
  );

  const pollUntilDone = useCallback(
    async (taskId: string, taskIndex: number): Promise<string | null> => {
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const res = await fetch("/api/poll-task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId }),
          });
          const data = await res.json();
          if (data.status === "success") return data.resultUrl;
          if (data.status === "error") throw new Error(data.error || "Echec");
          dispatch({ type: "UPDATE_TASK", index: taskIndex, update: { status: "polling" } });
        } catch (err) {
          if (attempt >= 9) throw err;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      throw new Error("Generation trop longue");
    },
    []
  );

  const runSingleTask = useCallback(
    async (
      imageUrl: string,
      taskType: "enhancement" | "roof",
      taskIndex: number,
      colorKey?: string,
      roofStyle?: string
    ): Promise<string | null> => {
      // If task already has a taskId (resumed), skip create — go straight to poll
      const existingTaskId = state.tasks[taskIndex]?.taskId;
      const existingStatus = state.tasks[taskIndex]?.status;

      if (existingStatus === "success" && state.tasks[taskIndex]?.resultUrl) {
        return state.tasks[taskIndex].resultUrl ?? null;
      }

      let taskId: string;
      if (existingTaskId) {
        taskId = existingTaskId;
        dispatch({ type: "UPDATE_TASK", index: taskIndex, update: { status: "polling" } });
      } else {
        dispatch({ type: "UPDATE_TASK", index: taskIndex, update: { status: "creating" } });
        taskId = await createKieTask(imageUrl, taskType, colorKey, roofStyle);
        dispatch({ type: "UPDATE_TASK", index: taskIndex, update: { status: "polling", taskId } });
      }

      const resultUrl = await pollUntilDone(taskId, taskIndex);
      dispatch({
        type: "UPDATE_TASK",
        index: taskIndex,
        update: { status: "success", resultUrl: resultUrl ?? undefined },
      });
      return resultUrl;
    },
    [createKieTask, pollUntilDone, state.tasks]
  );

  // ─── Generation orchestration ───────────────────────────────────────────

  const runGenerationPipeline = useCallback(
    async (
      sourceUrl: string,
      tasks: GenerationTask[]
    ) => {
      // Step 1: Enhancement (task index 0)
      let enhancedUrl = sourceUrl;
      try {
        const result = await runSingleTask(sourceUrl, "enhancement", 0);
        if (result) {
          enhancedUrl = result;
          enhancedUrlRef.current = result;
          dispatch({ type: "SET_ENHANCED_URL", url: result });
        }
      } catch (err) {
        dispatch({
          type: "UPDATE_TASK",
          index: 0,
          update: {
            status: "error",
            error: err instanceof Error ? err.message : "Erreur",
          },
        });
        // Continue with original photo
      }

      // Step 2: Roof tasks (3 at a time)
      const roofIndexes = tasks
        .map((t, i) => ({ ...t, index: i }))
        .filter((t) => t.taskType === "roof")
        .map((t) => t.index);

      const CONCURRENCY = 3;
      for (let i = 0; i < roofIndexes.length; i += CONCURRENCY) {
        const batch = roofIndexes.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map((idx) => {
            const task = tasks[idx];
            return runSingleTask(
              enhancedUrl,
              "roof",
              idx,
              task.colorKey,
              task.roofStyle
            ).catch((err) => {
              dispatch({
                type: "UPDATE_TASK",
                index: idx,
                update: {
                  status: "error",
                  error: err instanceof Error ? err.message : "Erreur",
                },
              });
            });
          })
        );
      }
    },
    [runSingleTask]
  );

  // After tasks update (any change), check if we're done and persist results
  const finalizingRef = useRef(false);
  useEffect(() => {
    if (state.phase !== "generating" || finalizingRef.current) return;
    if (state.tasks.length === 0) return;

    const allDone = state.tasks.every(
      (t) => t.status === "success" || t.status === "error"
    );
    if (!allDone) return;

    finalizingRef.current = true;

    (async () => {
      // Build results for this code
      const colorMap: Record<
        string,
        {
          waveTileUrl?: string;
          standingSeamUrl?: string;
          shingleTileUrl?: string;
        }
      > = {};
      for (const task of state.tasks) {
        if (task.taskType !== "roof" || task.status !== "success" || !task.resultUrl)
          continue;
        if (!colorMap[task.colorKey]) colorMap[task.colorKey] = {};
        if (task.roofStyle === "wave_tile") {
          colorMap[task.colorKey].waveTileUrl = task.resultUrl;
        } else if (task.roofStyle === "standing_seam") {
          colorMap[task.colorKey].standingSeamUrl = task.resultUrl;
        } else {
          colorMap[task.colorKey].shingleTileUrl = task.resultUrl;
        }
      }
      const results = Object.entries(colorMap)
        .filter(
          ([, v]) => v.waveTileUrl || v.standingSeamUrl || v.shingleTileUrl
        )
        .map(([colorKey, v]) => ({
          colorKey,
          waveTileUrl: v.waveTileUrl,
          standingSeamUrl: v.standingSeamUrl,
          shingleTileUrl: v.shingleTileUrl,
        }));

      const enhancedImageUrl =
        enhancedUrlRef.current ||
        state.enhancedImageUrl ||
        state.uploadedImageUrl ||
        "";
      const originalImageUrl = state.uploadedImageUrl || enhancedImageUrl;

      const completedResults = {
        enhancedImageUrl,
        originalImageUrl,
        results,
        completedAt: Date.now(),
      };

      // Persist to KV via API
      try {
        await fetch(`/api/client/${code}/results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(completedResults),
        });
      } catch {
        // Even if persist fails, we still show results to client (they have the page open)
      }

      dispatch({ type: "GEN_DONE", results: completedResults });
    })();
  }, [state.phase, state.tasks, state.enhancedImageUrl, state.uploadedImageUrl, code]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleUploaded = useCallback(
    (_file: File, preview: string, remoteUrl: string) => {
      dispatch({ type: "SET_UPLOAD", url: remoteUrl, preview });
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!state.uploadedImageUrl) return;
    if (state.selectedColors.length === 0 || state.selectedStyles.length === 0)
      return;

    dispatch({ type: "SET_ERROR", error: null });

    // 1. Claim the code atomically
    let claimResp: Response;
    try {
      claimResp = await fetch(`/api/client/${code}/use`, { method: "POST" });
    } catch {
      dispatch({
        type: "SET_ERROR",
        error: "Erreur reseau. Verifiez votre connexion et reessayez.",
      });
      return;
    }
    if (!claimResp.ok) {
      const data = await claimResp.json().catch(() => ({}));
      if (claimResp.status === 409) {
        // Already used — refresh to land on the right state
        window.location.reload();
        return;
      }
      dispatch({
        type: "SET_ERROR",
        error: data.error || "Impossible de lancer la simulation.",
      });
      return;
    }

    // 2. Build tasks and start
    const tasks: GenerationTask[] = [];
    tasks.push({
      taskType: "enhancement",
      colorKey: "",
      roofStyle: "wave_tile",
      side: "front",
      status: "pending",
    });
    for (const colorKey of state.selectedColors) {
      for (const roofStyle of state.selectedStyles) {
        tasks.push({
          taskType: "roof",
          colorKey,
          roofStyle,
          side: "front",
          status: "pending",
        });
      }
    }

    enhancedUrlRef.current = null;
    finalizingRef.current = false;
    dispatch({ type: "START_GEN", tasks });

    // Start generation loop
    runGenerationPipeline(state.uploadedImageUrl, tasks);
  }, [
    state.uploadedImageUrl,
    state.selectedColors,
    state.selectedStyles,
    code,
    runGenerationPipeline,
  ]);

  const handleDownloadPdf = useCallback(async () => {
    const r = state.completedResults;
    if (!r) return;
    dispatch({ type: "SET_PDF_LOADING", loading: true });

    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalImageUrl: r.enhancedImageUrl || r.originalImageUrl,
          results: r.results,
          clientName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de la creation du PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simulation-toiture-${clientName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Erreur PDF",
      });
    } finally {
      dispatch({ type: "SET_PDF_LOADING", loading: false });
    }
  }, [state.completedResults, clientName]);

  // Restore tasks-from-results for ResultsGallery on done state
  const tasksForGallery = (() => {
    if (!state.completedResults) return state.tasks;
    const out: GenerationTask[] = [];
    for (const r of state.completedResults.results) {
      if (r.waveTileUrl) {
        out.push({
          taskType: "roof",
          colorKey: r.colorKey,
          roofStyle: "wave_tile",
          side: "front",
          status: "success",
          resultUrl: r.waveTileUrl,
        });
      }
      if (r.standingSeamUrl) {
        out.push({
          taskType: "roof",
          colorKey: r.colorKey,
          roofStyle: "standing_seam",
          side: "front",
          status: "success",
          resultUrl: r.standingSeamUrl,
        });
      }
      if (r.shingleTileUrl) {
        out.push({
          taskType: "roof",
          colorKey: r.colorKey,
          roofStyle: "shingle_tile",
          side: "front",
          status: "success",
          resultUrl: r.shingleTileUrl,
        });
      }
    }
    return out;
  })();

  const expirationDate = new Date(expiresAt).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto">
      {/* Greeting */}
      {state.phase !== "already_used_pending" && (
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-1">
            Simulation personnalisee
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Bonjour {clientName.split(/\s+/)[0]}
          </h1>
          <p className="text-gray-500 mt-2">
            Visualisez votre maison avec une nouvelle toiture en metal
          </p>
        </div>
      )}

      {state.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <p className="font-semibold">Erreur</p>
          <p className="text-sm mt-1">{state.error}</p>
        </div>
      )}

      {/* CONFIG PHASE */}
      {state.phase === "config" && (
        <>
          {!state.uploadedImageUrl ? (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  Etape 1 : Telechargez une photo de votre maison
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Idealement une photo de jour, prise de face, avec la toiture
                  bien visible.
                </p>
              </div>
              <ImageUploader onUploaded={handleUploaded} />
            </div>
          ) : (
            <div>
              <div className="mb-8">
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm max-w-md mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.uploadedImagePreview || state.uploadedImageUrl}
                    alt="Votre maison"
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">
                  Photo telechargee avec succes
                </p>
              </div>

              <ColorSelector
                selectedColors={state.selectedColors}
                onToggle={(key) => dispatch({ type: "TOGGLE_COLOR", key })}
              />

              <StyleSelector
                selectedStyles={state.selectedStyles}
                onToggle={(style) => dispatch({ type: "TOGGLE_STYLE", style })}
              />

              <div className="mt-8 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
                <p className="font-semibold">Important :</p>
                <p className="mt-1">
                  Vous pouvez lancer votre simulation <strong>une seule fois</strong>.
                  Choisissez bien vos couleurs et styles avant de cliquer sur
                  &quot;Generer&quot;.
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={
                  state.selectedColors.length === 0 ||
                  state.selectedStyles.length === 0
                }
                className="w-full py-4 bg-accent text-white rounded-xl font-bold text-lg hover:bg-accent-light transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Generer ma simulation
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                Lien valide jusqu&apos;au {expirationDate}
              </p>
            </div>
          )}
        </>
      )}

      {/* GENERATING PHASE */}
      {state.phase === "generating" && (
        <div>
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500">
              La generation peut prendre 3 a 8 minutes. Vous pouvez laisser
              cette page ouverte.
            </p>
          </div>
          <ProgressPanel tasks={state.tasks} />
        </div>
      )}

      {/* DONE PHASE */}
      {state.phase === "done" && state.completedResults && (
        <div>
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-green-100 border border-green-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-7 h-7 text-green-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Votre simulation est prete
            </h2>
            <p className="text-gray-500 mt-2">
              Telechargez votre PDF personnalise ci-dessous.
            </p>
          </div>

          <ResultsGallery tasks={tasksForGallery} />

          {state.completedResults.results.length > 0 && (
            <DownloadButton
              loading={state.pdfLoading}
              onClick={handleDownloadPdf}
            />
          )}

          <div className="text-center mt-8 text-sm text-gray-500">
            Une question ? Contactez-nous au{" "}
            <a
              href="tel:5148670787"
              className="font-semibold text-accent hover:underline"
            >
              (514) 867-0787
            </a>
          </div>
        </div>
      )}

      {/* USED BUT NO RESULTS, AND NO LOCAL STATE TO RESUME */}
      {state.phase === "already_used_pending" && (
        <div className="max-w-lg mx-auto mt-12">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-7 h-7 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Simulation deja en cours
            </h1>
            <p className="text-gray-600 leading-relaxed">
              Cette simulation a ete demarree depuis un autre appareil ou
              navigateur. Pour acceder a vos resultats ou recommencer,
              contactez votre representant Metal Roof Montreal.
            </p>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700">
                (514) 867-0787
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
