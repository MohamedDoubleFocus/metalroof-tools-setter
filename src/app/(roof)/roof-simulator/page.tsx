"use client";

import { useReducer, useCallback } from "react";
import type {
  AppState,
  AppAction,
  GenerationTask,
  RoofStyle,
  InputMode,
} from "@/types";
import Header from "@/components/Header";
import InputModeSelector from "@/components/InputModeSelector";
import AddressInput from "@/components/AddressInput";
import ImageUploader from "@/components/ImageUploader";
import ColorSelector from "@/components/ColorSelector";
import StyleSelector from "@/components/StyleSelector";
import GenerateButton from "@/components/GenerateButton";
import ProgressPanel from "@/components/ProgressPanel";
import ResultsGallery from "@/components/ResultsGallery";
import DownloadButton from "@/components/DownloadButton";

const initialState: AppState = {
  step: "input_mode",
  inputMode: null,
  uploadedFile: null,
  uploadedImageUrl: null,
  uploadedImagePreview: null,
  enhancedImageUrl: null,
  address: null,
  selectedColors: [],
  selectedStyles: [],
  tasks: [],
  pdfLoading: false,
  uploadLoading: false,
  error: null,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_INPUT_MODE":
      return { ...state, inputMode: action.mode, step: action.mode };
    case "SET_FILE":
      return {
        ...state,
        uploadedFile: action.file,
        uploadedImagePreview: action.preview,
        uploadLoading: true,
      };
    case "SET_UPLOADED_URL":
      return {
        ...state,
        uploadedImageUrl: action.url,
        uploadedImagePreview: action.preview || state.uploadedImagePreview,
        uploadLoading: false,
        step: "select_colors",
      };
    case "SET_UPLOAD_LOADING":
      return { ...state, uploadLoading: action.loading };
    case "SET_ADDRESS":
      return { ...state, address: action.address };
    case "TOGGLE_COLOR": {
      const idx = state.selectedColors.indexOf(action.colorKey);
      let newColors: string[];
      if (idx >= 0) {
        newColors = state.selectedColors.filter((c) => c !== action.colorKey);
      } else if (state.selectedColors.length < 3) {
        newColors = [...state.selectedColors, action.colorKey];
      } else {
        newColors = state.selectedColors;
      }
      return { ...state, selectedColors: newColors };
    }
    case "TOGGLE_STYLE": {
      const idx = state.selectedStyles.indexOf(action.style);
      let newStyles: RoofStyle[];
      if (idx >= 0) {
        newStyles = state.selectedStyles.filter((s) => s !== action.style);
      } else {
        newStyles = [...state.selectedStyles, action.style];
      }
      return { ...state, selectedStyles: newStyles };
    }
    case "START_GENERATION":
      return { ...state, step: "generating", tasks: action.tasks };
    case "UPDATE_TASK": {
      const tasks = [...state.tasks];
      tasks[action.taskIndex] = {
        ...tasks[action.taskIndex],
        ...action.update,
      };
      return { ...state, tasks };
    }
    case "SET_ENHANCED_URL":
      return { ...state, enhancedImageUrl: action.url };
    case "GENERATION_COMPLETE":
      return { ...state, step: "results" };
    case "SET_PDF_LOADING":
      return { ...state, pdfLoading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export default function RoofSimulator() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleInputMode = useCallback((mode: InputMode) => {
    dispatch({ type: "SET_INPUT_MODE", mode });
  }, []);

  const handleUploaded = useCallback(
    (_file: File, preview: string, remoteUrl: string) => {
      dispatch({ type: "SET_FILE", file: _file, preview });
      dispatch({ type: "SET_UPLOADED_URL", url: remoteUrl });
    },
    []
  );

  const handleAddressResult = useCallback(
    (preview: string, remoteUrl: string, address: string) => {
      dispatch({ type: "SET_ADDRESS", address });
      dispatch({ type: "SET_UPLOADED_URL", url: remoteUrl, preview });
    },
    []
  );

  const canGenerate =
    state.selectedColors.length === 3 && state.selectedStyles.length >= 1;

  const handleGenerate = useCallback(async () => {
    if (!state.uploadedImageUrl || !canGenerate) return;

    const tasks: GenerationTask[] = [];

    tasks.push({
      taskType: "enhancement",
      colorKey: "",
      roofStyle: "wave_tile",
      status: "pending",
    });

    for (const colorKey of state.selectedColors) {
      for (const style of state.selectedStyles) {
        tasks.push({
          taskType: "roof",
          colorKey,
          roofStyle: style,
          status: "pending",
        });
      }
    }

    dispatch({ type: "START_GENERATION", tasks });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: state.uploadedImageUrl,
          colors: state.selectedColors,
          styles: state.selectedStyles,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Erreur de connexion au serveur");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "complete") {
              dispatch({ type: "GENERATION_COMPLETE" });
              return;
            }

            if (data.taskIndex !== undefined) {
              dispatch({
                type: "UPDATE_TASK",
                taskIndex: data.taskIndex,
                update: {
                  status: data.status,
                  resultUrl: data.resultUrl,
                  taskId: data.taskId,
                  error: data.error,
                },
              });

              if (
                data.taskIndex === 0 &&
                data.status === "success" &&
                data.resultUrl
              ) {
                dispatch({
                  type: "SET_ENHANCED_URL",
                  url: data.resultUrl,
                });
              }
            }
          } catch {
            // skip unparseable lines
          }
        }
      }

      dispatch({ type: "GENERATION_COMPLETE" });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error:
          err instanceof Error ? err.message : "Erreur lors de la generation",
      });
    }
  }, [state.uploadedImageUrl, state.selectedColors, state.selectedStyles, canGenerate]);

  const handleDownloadPdf = useCallback(async () => {
    dispatch({ type: "SET_PDF_LOADING", loading: true });

    try {
      const colorResults: Record<
        string,
        { waveTileUrl?: string; standingSeamUrl?: string }
      > = {};
      for (const task of state.tasks) {
        if (
          task.taskType !== "roof" ||
          task.status !== "success" ||
          !task.resultUrl
        )
          continue;
        if (!colorResults[task.colorKey]) colorResults[task.colorKey] = {};
        if (task.roofStyle === "wave_tile") {
          colorResults[task.colorKey].waveTileUrl = task.resultUrl;
        } else {
          colorResults[task.colorKey].standingSeamUrl = task.resultUrl;
        }
      }

      const results = Object.entries(colorResults)
        .filter(([, v]) => v.waveTileUrl || v.standingSeamUrl)
        .map(([colorKey, v]) => ({
          colorKey,
          waveTileUrl: v.waveTileUrl,
          standingSeamUrl: v.standingSeamUrl,
        }));

      const originalUrl =
        state.enhancedImageUrl || state.uploadedImageUrl;

      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalImageUrl: originalUrl,
          results,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || "Erreur lors de la creation du PDF"
        );
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "simulation-toiture.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors du telechargement du PDF",
      });
    } finally {
      dispatch({ type: "SET_PDF_LOADING", loading: false });
    }
  }, [state.tasks, state.uploadedImageUrl, state.enhancedImageUrl]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-10 px-4">
        {state.error && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <p className="font-semibold">Erreur</p>
            <p className="text-sm mt-1">{state.error}</p>
            <button
              onClick={() => dispatch({ type: "SET_ERROR", error: null })}
              className="text-sm underline mt-2"
            >
              Fermer
            </button>
          </div>
        )}

        {state.step === "input_mode" && (
          <InputModeSelector onSelect={handleInputMode} />
        )}

        {state.step === "address" && (
          <AddressInput
            onResult={handleAddressResult}
            onBack={() => dispatch({ type: "RESET" })}
          />
        )}

        {state.step === "upload" && (
          <div>
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="max-w-2xl mx-auto text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Retour
            </button>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">
                Telechargez une photo de votre maison
              </h2>
              <p className="text-gray-500 mt-2">
                Nous remplacerons la toiture avec les couleurs et styles de
                votre choix
              </p>
            </div>
            <ImageUploader onUploaded={handleUploaded} />
          </div>
        )}

        {state.step === "select_colors" && (
          <div className="max-w-3xl mx-auto">
            {state.uploadedImagePreview && (
              <div className="mb-8">
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm max-w-md mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.uploadedImagePreview}
                    alt="Votre maison"
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">
                  {state.address
                    ? `${state.address}`
                    : "Votre photo a ete telechargee avec succes"}
                </p>
              </div>
            )}

            <ColorSelector
              selectedColors={state.selectedColors}
              onToggle={(key) =>
                dispatch({ type: "TOGGLE_COLOR", colorKey: key })
              }
            />

            <StyleSelector
              selectedStyles={state.selectedStyles}
              onToggle={(style) =>
                dispatch({ type: "TOGGLE_STYLE", style })
              }
            />

            <GenerateButton
              disabled={!canGenerate}
              onClick={handleGenerate}
            />
          </div>
        )}

        {state.step === "generating" && <ProgressPanel tasks={state.tasks} />}

        {state.step === "results" && (
          <div>
            <ResultsGallery tasks={state.tasks} />
            <DownloadButton
              loading={state.pdfLoading}
              onClick={handleDownloadPdf}
            />
            <div className="text-center mt-6">
              <button
                onClick={() => dispatch({ type: "RESET" })}
                className="text-sm text-gray-500 underline hover:text-gray-700"
              >
                Recommencer avec une nouvelle photo
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-100 border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        <p>Metal Roof Montreal | metalroofmontreal.com | (514) 867-0787</p>
        <p className="mt-1">
          Les images sont des simulations approximatives et peuvent differer du
          produit final installe.
        </p>
      </footer>
    </div>
  );
}
