"use client";

import { useCallback, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/ImageUploader";
import ColorSelector from "@/components/ColorSelector";
import StyleSelector from "@/components/StyleSelector";
import ResultsGallery from "@/components/ResultsGallery";
import DownloadButton from "@/components/DownloadButton";
import DisclaimerModal from "@/components/DisclaimerModal";
import type { GenerationTask, RoofStyle } from "@/types";
import type { ClientCodeResults } from "@/lib/kv";

type Phase = "config" | "submitting" | "remote_pending" | "done";

interface Props {
  code: string;
  clientName: string;
  expiresAt: number;
  initialState: "unused" | "used_pending" | "used_completed";
  initialResults: ClientCodeResults | null;
}

interface State {
  phase: Phase;
  uploadedImageUrl: string | null;
  uploadedImagePreview: string | null;
  selectedColors: string[];
  selectedStyles: RoofStyle[];
  pdfLoading: boolean;
  error: string | null;
  completedResults: ClientCodeResults | null;
}

type Action =
  | { type: "SET_PHASE"; phase: Phase }
  | { type: "SET_UPLOAD"; url: string; preview: string }
  | { type: "TOGGLE_COLOR"; key: string }
  | { type: "TOGGLE_STYLE"; style: RoofStyle }
  | { type: "SET_PDF_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null };

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
    case "SET_PDF_LOADING":
      return { ...state, pdfLoading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error };
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
      selectedColors: [],
      selectedStyles: [],
      pdfLoading: false,
      error: null,
      completedResults: props.initialResults,
    };
  }
  if (props.initialState === "used_pending") {
    return {
      phase: "remote_pending",
      uploadedImageUrl: null,
      uploadedImagePreview: null,
      selectedColors: [],
      selectedStyles: [],
      pdfLoading: false,
      error: null,
      completedResults: null,
    };
  }
  return {
    phase: "config",
    uploadedImageUrl: null,
    uploadedImagePreview: null,
    selectedColors: [],
    selectedStyles: [],
    pdfLoading: false,
    error: null,
    completedResults: null,
  };
}

export default function ClientSimulator(props: Props) {
  const { code, clientName, expiresAt } = props;
  const [state, dispatch] = useReducer(reducer, props, initialReducerState);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const router = useRouter();

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleUploaded = useCallback(
    (_file: File, preview: string, remoteUrl: string) => {
      dispatch({ type: "SET_UPLOAD", url: remoteUrl, preview });
    },
    []
  );

  const handleClickGenerate = useCallback(() => {
    if (!state.uploadedImageUrl) return;
    if (state.selectedColors.length === 0 || state.selectedStyles.length === 0)
      return;
    setDisclaimerOpen(true);
  }, [state.uploadedImageUrl, state.selectedColors, state.selectedStyles]);

  const handleConfirmGenerate = useCallback(async () => {
    setDisclaimerOpen(false);

    if (!state.uploadedImageUrl) return;
    dispatch({ type: "SET_PHASE", phase: "submitting" });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      const res = await fetch(`/api/client/${code}/start-generation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadedImageUrl: state.uploadedImageUrl,
          selectedColors: state.selectedColors,
          selectedStyles: state.selectedStyles,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          window.location.reload();
          return;
        }
        dispatch({
          type: "SET_ERROR",
          error: data.error || "Impossible de lancer la simulation.",
        });
        dispatch({ type: "SET_PHASE", phase: "config" });
        return;
      }

      // Generation now runs server-side. Send the client to the thank-you page.
      router.push(`/client/${code}/merci`);
    } catch {
      dispatch({
        type: "SET_ERROR",
        error: "Erreur réseau. Vérifiez votre connexion et réessayez.",
      });
      dispatch({ type: "SET_PHASE", phase: "config" });
    }
  }, [
    state.uploadedImageUrl,
    state.selectedColors,
    state.selectedStyles,
    code,
    router,
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
        throw new Error(data.error || "Erreur lors de la création du PDF");
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

  // Convert completed results → tasks for the gallery component
  const tasksForGallery: GenerationTask[] = (() => {
    if (!state.completedResults) return [];
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
      {state.phase !== "remote_pending" && (
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-1">
            Simulation personnalisée
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Bonjour {clientName.split(/\s+/)[0]}
          </h1>
          <p className="text-gray-500 mt-2">
            Visualisez votre maison avec une nouvelle toiture en métal
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
                  Étape 1 : Téléchargez une photo de votre maison
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Idéalement une photo de jour, prise de face, avec la toiture
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
                  Photo téléchargée avec succès
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
                  Vous pouvez lancer votre simulation{" "}
                  <strong>une seule fois</strong>. Choisissez bien vos couleurs
                  et styles avant de cliquer sur «&nbsp;Générer&nbsp;».
                </p>
              </div>

              <button
                onClick={handleClickGenerate}
                disabled={
                  state.selectedColors.length === 0 ||
                  state.selectedStyles.length === 0
                }
                className="w-full py-4 bg-accent text-white rounded-xl font-bold text-lg hover:bg-accent-light transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Générer ma simulation
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                Lien valide jusqu&apos;au {expirationDate}
              </p>
            </div>
          )}
        </>
      )}

      {/* SUBMITTING PHASE — brief loading state while POST is in flight */}
      {state.phase === "submitting" && (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-gray-600">Lancement de votre simulation…</p>
        </div>
      )}

      {/* DONE PHASE — client has come back to view their results */}
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
              Votre simulation est prête
            </h2>
            <p className="text-gray-500 mt-2">
              Téléchargez votre PDF personnalisé ci-dessous.
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
            Une question&nbsp;? Contactez-nous au{" "}
            <a
              href="tel:5148670787"
              className="font-semibold text-accent hover:underline"
            >
              (514) 867-0787
            </a>
          </div>
        </div>
      )}

      {/* REMOTE PENDING — generation already in progress server-side */}
      {state.phase === "remote_pending" && (
        <div className="max-w-lg mx-auto mt-12">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 bg-accent/10 rounded-full animate-pulse" />
              <div className="relative w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
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
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Votre simulation est en cours
            </h1>
            <p className="text-gray-600 leading-relaxed mb-3">
              Notre système est en train de générer vos images personnalisées.
              Vous recevrez un SMS
              {props.initialState === "used_pending" ? " (et un courriel si fourni)" : ""}{" "}
              dès que tout est prêt.
            </p>
            <p className="text-sm text-gray-500">
              Cela peut prendre <strong>3 à 8 minutes</strong>. Vous pouvez
              fermer cette page sans problème.
            </p>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Une question&nbsp;? Appelez-nous au{" "}
                <a
                  href="tel:5148670787"
                  className="font-semibold text-accent hover:underline"
                >
                  (514) 867-0787
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer modal — opens before launching the generation */}
      <DisclaimerModal
        open={disclaimerOpen}
        onConfirm={handleConfirmGenerate}
        onCancel={() => setDisclaimerOpen(false)}
      />
    </div>
  );
}
