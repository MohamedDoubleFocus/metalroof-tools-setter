"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MatchProposal } from "@/lib/chantiers/roofr-match";

type VerdictFilter = "all" | "auto" | "review" | "none";

const SAMPLE = `adresse	lien_roofr
8 Chem. McConnell, Montréal, QC H9S 5N9	https://drive.google.com/file/d/abc123/view?usp=drivesdk
34 rue Caron, St-Eustache	https://drive.google.com/file/d/def456/view?usp=drivesdk`;

interface MatchResult {
  proposals: MatchProposal[];
  counts: {
    total: number;
    auto: number;
    review: number;
    none: number;
  };
}

function parseCsv(text: string): { address: string; roofrUrl: string }[] {
  const cleaned = text.replace(/\r\n?/g, "\n").trim();
  if (!cleaned) return [];
  const lines = cleaned.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Detect delimiter (tab vs comma) on the first line
  const delim = lines[0].includes("\t") ? "\t" : ",";

  // Optional header row — detected if first cell doesn't look like a real
  // address (no digit, contains a header-ish keyword).
  const firstCells = lines[0].split(delim).map((c) => c.trim().toLowerCase());
  const looksLikeHeader =
    firstCells[0]?.includes("address") ||
    firstCells[0]?.includes("adresse") ||
    firstCells[1]?.includes("url") ||
    firstCells[1]?.includes("lien") ||
    firstCells[1]?.includes("drive") ||
    firstCells[1]?.includes("roofr");
  const dataLines = looksLikeHeader ? lines.slice(1) : lines;

  return dataLines
    .map((line) => {
      const cells = parseCsvLine(line, delim);
      return {
        address: (cells[0] || "").trim(),
        roofrUrl: (cells[1] || "").trim(),
      };
    })
    .filter((r) => r.address && r.roofrUrl);
}

function parseCsvLine(line: string, delim: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delim) {
        cells.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

export default function ImportRoofrPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [matching, setMatching] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [filter, setFilter] = useState<VerdictFilter>("all");
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const [pickedCandidate, setPickedCandidate] = useState<
    Record<number, string>
  >({});
  const [applying, setApplying] = useState(false);
  const [applyOutcome, setApplyOutcome] = useState<{
    successCount: number;
    errorCount: number;
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    // Read as UTF-8 (default). Google Sheets exports CSV as UTF-8.
    const content = await file.text();
    setText(content);
    setResult(null);
    setConfirmed(new Set());
    setPickedCandidate({});
    setApplyOutcome(null);
  };

  const clearFile = () => {
    setText("");
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setResult(null);
    setConfirmed(new Set());
    setPickedCandidate({});
    setApplyOutcome(null);
  };

  const filteredProposals = useMemo(() => {
    if (!result) return [];
    if (filter === "all") return result.proposals;
    return result.proposals.filter((p) => p.verdict === filter);
  }, [result, filter]);

  const handleMatch = async () => {
    const rows = parseCsv(text);
    if (rows.length === 0) {
      alert("Aucune ligne valide à matcher.");
      return;
    }
    setMatching(true);
    setResult(null);
    setConfirmed(new Set());
    setPickedCandidate({});
    setApplyOutcome(null);
    try {
      const res = await fetch("/api/chantiers/roofr-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur matching");
        return;
      }
      setResult(data);

      // Pre-confirm the "auto" matches; let the user toggle review ones.
      const autoConfirmed = new Set<number>();
      for (const p of data.proposals as MatchProposal[]) {
        if (p.verdict === "auto" && p.bestChantierId) {
          autoConfirmed.add(p.rowIndex);
        }
      }
      setConfirmed(autoConfirmed);
    } finally {
      setMatching(false);
    }
  };

  const toggleConfirm = (rowIndex: number) => {
    setConfirmed((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const pickCandidate = (rowIndex: number, chantierId: string) => {
    setPickedCandidate((prev) => ({ ...prev, [rowIndex]: chantierId }));
    setConfirmed((prev) => {
      const next = new Set(prev);
      next.add(rowIndex);
      return next;
    });
  };

  const handleApply = async () => {
    if (!result || confirmed.size === 0) return;
    if (
      !window.confirm(
        `Attacher ${confirmed.size} lien${confirmed.size > 1 ? "s" : ""} Roofr aux chantiers correspondants ?`
      )
    )
      return;
    setApplying(true);
    try {
      const items = result.proposals
        .filter((p) => confirmed.has(p.rowIndex))
        .map((p) => ({
          chantierId: pickedCandidate[p.rowIndex] || p.bestChantierId,
          roofrUrl: p.roofrUrl,
        }))
        .filter(
          (item): item is { chantierId: string; roofrUrl: string } =>
            !!item.chantierId
        );

      const res = await fetch("/api/chantiers/roofr-attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur");
        return;
      }
      setApplyOutcome({
        successCount: data.successCount,
        errorCount: data.errorCount,
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/chantiers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Retour aux chantiers
        </Link>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Import rapports Roofr
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Colle ici le CSV exporté depuis Google Sheets (généré par ton flow
          Make). L&apos;app fait le matching fuzzy sur l&apos;adresse et te
          propose les matchs avant d&apos;attacher.
        </p>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-sm">
        <p className="font-bold text-blue-900 mb-2">Format attendu</p>
        <p className="text-blue-900">
          <strong>Colonne 1</strong> : adresse (le nom du PDF). <strong>Colonne 2</strong> :
          lien Drive partageable. Le nom des colonnes peut être n&apos;importe
          quoi (<code className="text-xs bg-white px-1 py-0.5 rounded">adresse</code>{" "}
          + <code className="text-xs bg-white px-1 py-0.5 rounded">lien_roofr</code>{" "}
          fonctionne, comme <code className="text-xs bg-white px-1 py-0.5 rounded">address</code>{" "}
          + <code className="text-xs bg-white px-1 py-0.5 rounded">roofrUrl</code>).
          Séparateur tab ou virgule. Header optionnel.
        </p>
        <p className="text-blue-900 mt-2 text-xs">
          <strong>Tip Google Sheets</strong> : sélectionne les deux colonnes →
          Ctrl+C → colle directement dans la zone ci-dessous (le tab est
          automatique).
        </p>
        <button
          onClick={() => setText(SAMPLE)}
          className="mt-3 text-xs underline text-blue-700 hover:text-blue-900"
        >
          Charger un exemple
        </button>
      </div>

      {/* File upload zone */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-4 sm:p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
          onChange={handleFileChange}
          className="hidden"
          id="roofr-csv-upload"
        />
        {fileName ? (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700">
              📄 <strong>{fileName}</strong> chargé
            </span>
            <button
              onClick={clearFile}
              className="text-xs text-gray-500 hover:text-red-600 underline-offset-2 hover:underline"
            >
              Retirer
            </button>
          </div>
        ) : (
          <label
            htmlFor="roofr-csv-upload"
            className="cursor-pointer block"
          >
            <div className="text-3xl mb-2">📁</div>
            <div className="text-sm font-semibold text-gray-800">
              Cliquer pour choisir un fichier CSV
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ou colle directement dans la zone ci-dessous
            </div>
          </label>
        )}
      </div>

      <div className="text-center text-xs text-gray-400 font-semibold">— OU —</div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (fileName) setFileName(null); // user is editing manually
        }}
        rows={8}
        placeholder="Colle ton CSV/TSV ici…"
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-mono focus:border-accent focus:outline-none resize-y"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleMatch}
          disabled={matching || !text.trim()}
          className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black disabled:bg-gray-300"
        >
          {matching ? "Matching..." : "Calculer les matchs"}
        </button>
        {result && (
          <button
            onClick={handleApply}
            disabled={applying || confirmed.size === 0}
            className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light disabled:bg-gray-300"
          >
            {applying
              ? "Attache en cours..."
              : `Attacher ${confirmed.size} lien${confirmed.size > 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 flex-wrap text-sm">
            <span className="px-3 py-1 bg-green-50 text-green-800 rounded-lg font-semibold">
              ✓ Auto : {result.counts.auto}
            </span>
            <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded-lg font-semibold">
              ⚠ À revoir : {result.counts.review}
            </span>
            <span className="px-3 py-1 bg-red-50 text-red-800 rounded-lg font-semibold">
              ✗ Aucun match : {result.counts.none}
            </span>
            <span className="text-gray-500 text-xs">
              {confirmed.size} sélectionné{confirmed.size > 1 ? "s" : ""}
            </span>
          </div>

          {/* Verdict filter tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "auto", "review", "none"] as VerdictFilter[]).map((v) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  filter === v
                    ? "bg-accent text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {v === "all"
                  ? `Tous (${result.counts.total})`
                  : v === "auto"
                    ? `Auto (${result.counts.auto})`
                    : v === "review"
                      ? `À revoir (${result.counts.review})`
                      : `Aucun (${result.counts.none})`}
              </button>
            ))}
          </div>

          {/* Proposals */}
          <div className="space-y-2">
            {filteredProposals.map((p) => {
              const isConfirmed = confirmed.has(p.rowIndex);
              const pickedId = pickedCandidate[p.rowIndex] || p.bestChantierId;
              const verdictTone =
                p.verdict === "auto"
                  ? "border-green-200 bg-green-50"
                  : p.verdict === "review"
                    ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50";

              return (
                <div
                  key={p.rowIndex}
                  className={`border-2 rounded-xl p-3 ${verdictTone}`}
                >
                  <div className="flex items-start gap-3">
                    {p.verdict !== "none" && (
                      <input
                        type="checkbox"
                        checked={isConfirmed}
                        onChange={() => toggleConfirm(p.rowIndex)}
                        className="mt-1 w-4 h-4 shrink-0 accent-accent"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white">
                          {p.verdict === "auto"
                            ? "AUTO"
                            : p.verdict === "review"
                              ? "À REVOIR"
                              : "PAS DE MATCH"}
                        </span>
                        {p.score && (
                          <span className="text-xs text-gray-600 font-mono">
                            {p.score.score}/100
                          </span>
                        )}
                        {p.alreadyHasRoofr && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                            Déjà un lien
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-800 font-semibold truncate">
                        PDF : {p.csvAddress}
                      </div>

                      {p.verdict === "none" ? (
                        <div className="text-xs text-red-700 mt-1">
                          Aucun chantier en base ne correspond à cette adresse.
                        </div>
                      ) : (
                        p.bestChantierId && (
                          <>
                            <div className="text-xs text-gray-600 mt-1">
                              <span className="text-gray-400">→</span> Match :{" "}
                              <strong>{p.bestChantierLabel}</strong>{" "}
                              <span className="text-gray-500">
                                ({p.bestChantierAddress})
                              </span>
                            </div>

                            {p.verdict === "review" &&
                              p.candidates.length > 1 && (
                                <div className="mt-2 space-y-1">
                                  <div className="text-[11px] font-semibold text-gray-700">
                                    Autres candidats :
                                  </div>
                                  {p.candidates.slice(1).map((cand) => (
                                    <button
                                      key={cand.chantierId}
                                      onClick={() =>
                                        pickCandidate(
                                          p.rowIndex,
                                          cand.chantierId
                                        )
                                      }
                                      className={`text-left w-full text-xs px-2 py-1.5 rounded border ${
                                        pickedId === cand.chantierId
                                          ? "border-accent bg-white"
                                          : "border-gray-200 bg-white hover:border-gray-400"
                                      }`}
                                    >
                                      <span className="font-semibold">
                                        {cand.label}
                                      </span>{" "}
                                      <span className="text-gray-500">
                                        ({cand.address})
                                      </span>{" "}
                                      <span className="font-mono text-gray-500">
                                        {cand.score}/100
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                          </>
                        )
                      )}

                      <div className="mt-1 text-[11px] text-gray-500 break-all">
                        <a
                          href={p.roofrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent underline-offset-2 hover:underline"
                        >
                          {p.roofrUrl}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {applyOutcome && (
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Résultats</h2>
          <p className="text-sm">
            <span className="font-bold text-green-700">
              {applyOutcome.successCount} lien
              {applyOutcome.successCount > 1 ? "s" : ""} attaché
              {applyOutcome.successCount > 1 ? "s" : ""}
            </span>{" "}
            ·{" "}
            <span className="font-bold text-red-700">
              {applyOutcome.errorCount} erreur
              {applyOutcome.errorCount > 1 ? "s" : ""}
            </span>
          </p>
          <button
            onClick={() => router.push("/chantiers")}
            className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light"
          >
            Voir le pipeline →
          </button>
        </div>
      )}
    </div>
  );
}
