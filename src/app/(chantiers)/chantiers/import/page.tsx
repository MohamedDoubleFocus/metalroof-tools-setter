"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  parseChantiersCsv,
  rowToCreateInput,
  REQUIRED_HEADERS,
  OPTIONAL_HEADERS,
  type ParseResult,
} from "@/lib/chantiers/csv-parse";

const SAMPLE = `clientName	clientPhone	clientEmail	addressLine1	addressLine2	signedAt	scheduledDate	totalAmount	notes
Mme Edith Villalon	(514) 867-0787	edith@exemple.com	760 Pl. des Pointeliers	Montréal, QC H1B 5W5	2026-04-15		15000
Jean Tremblay	438-555-0199	jean@exemple.com	123 Rue Principale	Laval, QC H7A 1B2	2026-04-22	2026-06-15	18500	Bordure d'égout à confirmer`;

interface ImportResult {
  index: number;
  ok: boolean;
  id?: string;
  error?: string;
}

export default function ChantiersImportPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  const validCount = useMemo(
    () => parsed?.rows.filter((r) => r.errors.length === 0).length ?? 0,
    [parsed]
  );
  const errorCount = useMemo(
    () => parsed?.rows.filter((r) => r.errors.length > 0).length ?? 0,
    [parsed]
  );
  const blockingHeaderError =
    parsed && parsed.missingRequired.length > 0 ? parsed.missingRequired : null;

  const handleParse = () => {
    setResults(null);
    setParsed(parseChantiersCsv(text));
  };

  const loadSample = () => {
    setText(SAMPLE);
    setResults(null);
    setParsed(null);
  };

  const handleImport = async () => {
    if (!parsed || validCount === 0) return;
    if (
      !window.confirm(
        `Importer ${validCount} chantier${validCount > 1 ? "s" : ""} ? Les lignes en erreur seront ignorées.`
      )
    )
      return;
    setImporting(true);
    try {
      const items = parsed.rows
        .filter((r) => r.errors.length === 0)
        .map((r) => rowToCreateInput(r.data));
      const res = await fetch("/api/chantiers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur");
        return;
      }
      setResults(data.results);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/chantiers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Retour à la liste
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Import bulk de chantiers
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Colle ici un CSV ou un TSV (copie depuis Excel / Google Sheets). La
          première ligne doit contenir les noms de colonnes.
        </p>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-sm">
        <p className="font-bold text-blue-900 mb-2">Colonnes attendues</p>
        <p className="text-blue-900">
          <strong>Obligatoires :</strong>{" "}
          <code className="text-xs bg-white px-1 py-0.5 rounded">
            {REQUIRED_HEADERS.join(", ")}
          </code>
        </p>
        <p className="text-blue-900 mt-1">
          <strong>Optionnelles :</strong>{" "}
          <code className="text-xs bg-white px-1 py-0.5 rounded">
            {OPTIONAL_HEADERS.join(", ")}
          </code>
        </p>
        <p className="text-blue-900 mt-2 text-xs">
          Dates au format <code className="bg-white px-1 rounded">YYYY-MM-DD</code>.
          Téléphone 10+ chiffres (sera normalisé en E.164). Montant en nombre
          (virgule ou point OK).
        </p>
        <button
          onClick={loadSample}
          className="mt-3 text-xs underline text-blue-700 hover:text-blue-900"
        >
          Charger un exemple
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder="Colle ton CSV/TSV ici…"
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-mono focus:border-accent focus:outline-none resize-y"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black disabled:bg-gray-300"
        >
          Aperçu
        </button>
        {parsed && (
          <button
            onClick={handleImport}
            disabled={
              importing ||
              validCount === 0 ||
              !!blockingHeaderError ||
              !!results
            }
            className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light disabled:bg-gray-300"
          >
            {importing
              ? "Import en cours…"
              : `Importer ${validCount} chantier${validCount > 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {parsed && blockingHeaderError && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-800">
          <p className="font-bold">Colonnes obligatoires manquantes</p>
          <p className="text-sm mt-1">{blockingHeaderError.join(", ")}</p>
        </div>
      )}

      {parsed && !blockingHeaderError && parsed.rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="px-3 py-1 bg-green-50 text-green-800 rounded-lg font-semibold">
              {validCount} prêt{validCount > 1 ? "s" : ""}
            </span>
            {errorCount > 0 && (
              <span className="px-3 py-1 bg-red-50 text-red-800 rounded-lg font-semibold">
                {errorCount} en erreur (ignoré{errorCount > 1 ? "s" : ""})
              </span>
            )}
            <span className="text-gray-500">
              Délimiteur détecté : {parsed.delimiter === "\t" ? "tab" : "virgule"}
            </span>
          </div>

          {parsed.unknownHeaders.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
              Colonnes inconnues ignorées :{" "}
              <strong>{parsed.unknownHeaders.join(", ")}</strong>
            </div>
          )}

          <div className="overflow-x-auto bg-white border-2 border-gray-200 rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-left">Adresse</th>
                  <th className="px-3 py-2 text-left">Signé</th>
                  <th className="px-3 py-2 text-left">Install</th>
                  <th className="px-3 py-2 text-left">Total</th>
                  <th className="px-3 py-2 text-left">État</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((r) => (
                  <tr
                    key={r.index}
                    className={`border-t border-gray-100 ${r.errors.length > 0 ? "bg-red-50" : ""}`}
                  >
                    <td className="px-3 py-2 text-gray-400">{r.index}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{r.data.clientName}</div>
                      <div className="text-xs text-gray-500">
                        {r.data.clientPhone} · {r.data.clientEmail}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{r.data.addressLine1}</div>
                      <div className="text-xs text-gray-500">
                        {r.data.addressLine2}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {r.data.signedAt || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {r.data.scheduledDate || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {r.data.totalAmount || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.errors.length === 0 ? (
                        <span className="text-green-700 text-xs font-semibold">
                          ✓ OK
                        </span>
                      ) : (
                        <span className="text-red-700 text-xs">
                          {r.errors.join(" · ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results && (
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Résultats</h2>
          <p className="text-sm text-gray-700">
            <span className="font-bold text-green-700">
              {results.filter((r) => r.ok).length} créé(s)
            </span>{" "}
            ·{" "}
            <span className="font-bold text-red-700">
              {results.filter((r) => !r.ok).length} en erreur
            </span>
          </p>
          {results.some((r) => !r.ok) && (
            <ul className="text-xs text-red-700 space-y-1 max-h-48 overflow-y-auto">
              {results
                .filter((r) => !r.ok)
                .map((r) => (
                  <li key={r.index}>
                    Ligne {r.index + 1} : {r.error}
                  </li>
                ))}
            </ul>
          )}
          <button
            onClick={() => router.push("/chantiers")}
            className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light"
          >
            Voir la liste →
          </button>
        </div>
      )}
    </div>
  );
}
