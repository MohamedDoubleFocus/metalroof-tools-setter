"use client";

import { useReducer, useCallback, useRef } from "react";
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
  hasBackPhoto: false,
  backUploadedFile: null,
  backUploadedImageUrl: null,
  backUploadedImagePreview: null,
  backEnhancedImageUrl: null,
  backUploadLoading: false,
  address: null,
  clientName: "",
  customInstructions: "",
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
    case "SET_HAS_BACK_PHOTO":
      return {
        ...state,
        hasBackPhoto: action.value,
        // Clear back photo data when toggling off
        ...(action.value
          ? {}
          : {
              backUploadedFile: null,
              backUploadedImageUrl: null,
              backUploadedImagePreview: null,
              backEnhancedImageUrl: null,
              backUploadLoading: false,
            }),
      };
    case "SET_BACK_FILE":
      return {
        ...state,
        backUploadedFile: action.file,
        backUploadedImagePreview: action.preview,
        backUploadLoading: true,
      };
    case "SET_BACK_UPLOADED_URL":
      return {
        ...state,
        backUploadedImageUrl: action.url,
        backUploadedImagePreview:
          action.preview || state.backUploadedImagePreview,
        backUploadLoading: false,
      };
    case "SET_BACK_UPLOAD_LOADING":
      return { ...state, backUploadLoading: action.loading };
    case "SET_BACK_ENHANCED_URL":
      return { ...state, backEnhancedImageUrl: action.url };
    case "SET_ADDRESS":
      return { ...state, address: action.address };
    case "SET_CLIENT_NAME":
      return { ...state, clientName: action.name };
    case "SET_CUSTOM_INSTRUCTIONS":
      return { ...state, customInstructions: action.instructions };
    case "TOGGLE_COLOR": {
      const idx = state.selectedColors.indexOf(action.colorKey);
      let newColors: string[];
      if (idx >= 0) {
        newColors = state.selectedColors.filter((c) => c !== action.colorKey);
      } else {
        newColors = [...state.selectedColors, action.colorKey];
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
    case "SET_STEP":
      return { ...state, step: action.step };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export default function RoofSimulator() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const enhancedUrlRef = useRef<string | null>(null);
  const backEnhancedUrlRef = useRef<string | null>(null);

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

  const handleBackUploaded = useCallback(
    (_file: File, preview: string, remoteUrl: string) => {
      dispatch({ type: "SET_BACK_FILE", file: _file, preview });
      dispatch({ type: "SET_BACK_UPLOADED_URL", url: remoteUrl });
    },
    []
  );

  const canGenerate =
    state.selectedColors.length >= 1 &&
    state.selectedStyles.length >= 1 &&
    (!state.hasBackPhoto || !!state.backUploadedImageUrl);

  // Phase 1: Create task on Kie.AI, get taskId back immediately
  const createKieTask = useCallback(
    async (
      imageUrl: string,
      taskType: "enhancement" | "roof",
      colorKey?: string,
      roofStyle?: string,
      customInstructions?: string
    ): Promise<string> => {
      const res = await fetch("/api/generate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, taskType, colorKey, roofStyle, customInstructions }),
      });
      const data = await res.json();
      if (data.status === "created" && data.taskId) {
        return data.taskId;
      }
      throw new Error(data.error || "Erreur lors de la creation de la tache");
    },
    []
  );

  // Phase 2: Poll until done — auto-retries on Vercel timeout
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

          if (data.status === "success") {
            return data.resultUrl;
          }

          if (data.status === "error") {
            throw new Error(data.error || "Kie.AI a retourne une erreur");
          }

          // timeout — Vercel cut the connection but Kie.AI is still working
          // Update UI to show we're still polling
          dispatch({
            type: "UPDATE_TASK",
            taskIndex,
            update: { status: "polling" },
          });
          // Loop and retry immediately
        } catch (err) {
          // Network error or Vercel 504 — retry
          if (attempt >= 9) throw err;
          // Brief pause before retry on network errors
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      throw new Error("La generation a pris trop de temps (10 tentatives)");
    },
    []
  );

  // Combined: create + poll for a single task
  const runSingleTask = useCallback(
    async (
      imageUrl: string,
      taskType: "enhancement" | "roof",
      taskIndex: number,
      colorKey?: string,
      roofStyle?: string,
      customInstructions?: string
    ): Promise<string | null> => {
      // Phase 1: Create
      dispatch({
        type: "UPDATE_TASK",
        taskIndex,
        update: { status: "creating" },
      });

      const taskId = await createKieTask(imageUrl, taskType, colorKey, roofStyle, customInstructions);

      dispatch({
        type: "UPDATE_TASK",
        taskIndex,
        update: { status: "polling", taskId },
      });

      // Phase 2: Poll
      const resultUrl = await pollUntilDone(taskId, taskIndex);

      dispatch({
        type: "UPDATE_TASK",
        taskIndex,
        update: { status: "success", resultUrl: resultUrl || undefined },
      });

      return resultUrl;
    },
    [createKieTask, pollUntilDone]
  );

  // Helper: find task indexes by criteria
  const findTaskIndexes = useCallback(
    (
      tasks: GenerationTask[],
      predicate: (t: GenerationTask) => boolean
    ): number[] => {
      const out: number[] = [];
      tasks.forEach((t, i) => {
        if (predicate(t)) out.push(i);
      });
      return out;
    },
    []
  );

  // Phase 1: Run BOTH enhancements (front + back if applicable), then show checkpoint
  const runEnhancementPhase = useCallback(async () => {
    if (!state.uploadedImageUrl) return;
    dispatch({ type: "SET_STEP", step: "generating" });

    const enhancementIndexes = findTaskIndexes(
      state.tasks,
      (t) => t.taskType === "enhancement"
    );

    // Reset enhancements
    enhancementIndexes.forEach((i) => {
      dispatch({
        type: "UPDATE_TASK",
        taskIndex: i,
        update: { status: "pending", error: undefined, resultUrl: undefined },
      });
    });

    await Promise.all(
      enhancementIndexes.map(async (taskIndex) => {
        const task = state.tasks[taskIndex];
        const sourceUrl =
          task.side === "front"
            ? state.uploadedImageUrl
            : state.backUploadedImageUrl;
        if (!sourceUrl) return;
        try {
          const result = await runSingleTask(sourceUrl, "enhancement", taskIndex);
          if (result) {
            if (task.side === "front") {
              enhancedUrlRef.current = result;
              dispatch({ type: "SET_ENHANCED_URL", url: result });
            } else {
              backEnhancedUrlRef.current = result;
              dispatch({ type: "SET_BACK_ENHANCED_URL", url: result });
            }
          }
        } catch (err) {
          dispatch({
            type: "UPDATE_TASK",
            taskIndex,
            update: {
              status: "error",
              error: err instanceof Error ? err.message : "Erreur enhancement",
            },
          });
        }
      })
    );

    dispatch({ type: "SET_STEP", step: "checkpoint_enhanced" });
  }, [
    state.tasks,
    state.uploadedImageUrl,
    state.backUploadedImageUrl,
    runSingleTask,
    findTaskIndexes,
  ]);

  // Phase 2: Run the FIRST roof for each side (front + back if applicable)
  const runFirstRoofPhase = useCallback(
    async (frontEnhancedUrl: string, backEnhancedUrl: string | null) => {
      dispatch({ type: "SET_STEP", step: "generating" });

      const firstColor = state.selectedColors[0];
      const firstStyle = state.selectedStyles[0];

      const firstRoofIndexes = findTaskIndexes(
        state.tasks,
        (t) =>
          t.taskType === "roof" &&
          t.colorKey === firstColor &&
          t.roofStyle === firstStyle
      );

      // Reset
      firstRoofIndexes.forEach((i) => {
        dispatch({
          type: "UPDATE_TASK",
          taskIndex: i,
          update: { status: "pending", error: undefined, resultUrl: undefined },
        });
      });

      await Promise.all(
        firstRoofIndexes.map(async (taskIndex) => {
          const task = state.tasks[taskIndex];
          const sourceUrl =
            task.side === "front" ? frontEnhancedUrl : backEnhancedUrl;
          if (!sourceUrl) return;
          try {
            await runSingleTask(
              sourceUrl,
              "roof",
              taskIndex,
              task.colorKey,
              task.roofStyle,
              state.customInstructions
            );
          } catch (err) {
            dispatch({
              type: "UPDATE_TASK",
              taskIndex,
              update: {
                status: "error",
                error: err instanceof Error ? err.message : "Erreur",
              },
            });
          }
        })
      );

      dispatch({ type: "SET_STEP", step: "checkpoint_first_roof" });
    },
    [state.tasks, state.selectedColors, state.selectedStyles, state.customInstructions, runSingleTask, findTaskIndexes]
  );

  // Phase 3: Run all remaining roof tasks in parallel batches
  const runRemainingRoofsPhase = useCallback(
    async (frontEnhancedUrl: string, backEnhancedUrl: string | null) => {
      dispatch({ type: "SET_STEP", step: "generating" });

      const firstColor = state.selectedColors[0];
      const firstStyle = state.selectedStyles[0];

      const remainingIndexes = findTaskIndexes(
        state.tasks,
        (t) =>
          t.taskType === "roof" &&
          !(t.colorKey === firstColor && t.roofStyle === firstStyle)
      );

      if (remainingIndexes.length === 0) {
        dispatch({ type: "GENERATION_COMPLETE" });
        return;
      }

      const CONCURRENCY = 3;
      for (let i = 0; i < remainingIndexes.length; i += CONCURRENCY) {
        const batch = remainingIndexes.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map((taskIndex) => {
            const task = state.tasks[taskIndex];
            const sourceUrl =
              task.side === "front" ? frontEnhancedUrl : backEnhancedUrl;
            if (!sourceUrl) {
              dispatch({
                type: "UPDATE_TASK",
                taskIndex,
                update: { status: "error", error: "Photo source manquante" },
              });
              return Promise.resolve();
            }
            return runSingleTask(
              sourceUrl,
              "roof",
              taskIndex,
              task.colorKey,
              task.roofStyle,
              state.customInstructions
            ).catch((err) => {
              dispatch({
                type: "UPDATE_TASK",
                taskIndex,
                update: {
                  status: "error",
                  error: err instanceof Error ? err.message : "Erreur",
                },
              });
            });
          })
        );
      }

      dispatch({ type: "GENERATION_COMPLETE" });
    },
    [state.tasks, state.selectedColors, state.selectedStyles, state.customInstructions, runSingleTask, findTaskIndexes]
  );

  // Entry point: build task list and start phase 1
  const handleGenerate = useCallback(async () => {
    if (!state.uploadedImageUrl || !canGenerate) return;

    const sides: ("front" | "back")[] = state.hasBackPhoto
      ? ["front", "back"]
      : ["front"];

    const tasks: GenerationTask[] = [];

    // Enhancement tasks (one per side)
    for (const side of sides) {
      tasks.push({
        taskType: "enhancement",
        colorKey: "",
        roofStyle: "wave_tile",
        side,
        status: "pending",
      });
    }

    // Roof tasks: for each color × style × side
    for (const colorKey of state.selectedColors) {
      for (const style of state.selectedStyles) {
        for (const side of sides) {
          tasks.push({
            taskType: "roof",
            colorKey,
            roofStyle: style,
            side,
            status: "pending",
          });
        }
      }
    }

    dispatch({ type: "START_GENERATION", tasks });
    enhancedUrlRef.current = null;
    backEnhancedUrlRef.current = null;

    // Wait one tick so reducer applies, then run phase 1
    setTimeout(() => {
      runEnhancementPhase();
    }, 0);
  }, [
    state.uploadedImageUrl,
    state.hasBackPhoto,
    state.selectedColors,
    state.selectedStyles,
    canGenerate,
    runEnhancementPhase,
  ]);

  // Helpers to grab front/back enhanced URLs (with fallback to original)
  const getFrontEnhancedUrl = useCallback(() => {
    return (
      enhancedUrlRef.current ||
      state.enhancedImageUrl ||
      state.uploadedImageUrl
    );
  }, [state.enhancedImageUrl, state.uploadedImageUrl]);

  const getBackEnhancedUrl = useCallback(() => {
    if (!state.hasBackPhoto) return null;
    return (
      backEnhancedUrlRef.current ||
      state.backEnhancedImageUrl ||
      state.backUploadedImageUrl
    );
  }, [state.hasBackPhoto, state.backEnhancedImageUrl, state.backUploadedImageUrl]);

  // Checkpoint #1 actions
  const handleApproveEnhanced = useCallback(() => {
    const front = getFrontEnhancedUrl();
    const back = getBackEnhancedUrl();
    if (!front) return;
    runFirstRoofPhase(front, back);
  }, [getFrontEnhancedUrl, getBackEnhancedUrl, runFirstRoofPhase]);

  const handleRegenerateEnhanced = useCallback(() => {
    runEnhancementPhase();
  }, [runEnhancementPhase]);

  const handleSkipEnhanced = useCallback(() => {
    if (!state.uploadedImageUrl) return;
    enhancedUrlRef.current = state.uploadedImageUrl;
    if (state.hasBackPhoto && state.backUploadedImageUrl) {
      backEnhancedUrlRef.current = state.backUploadedImageUrl;
    }
    runFirstRoofPhase(
      state.uploadedImageUrl,
      state.hasBackPhoto ? state.backUploadedImageUrl : null
    );
  }, [
    state.uploadedImageUrl,
    state.hasBackPhoto,
    state.backUploadedImageUrl,
    runFirstRoofPhase,
  ]);

  // Checkpoint #2 actions
  const handleApproveFirstRoof = useCallback(() => {
    const front = getFrontEnhancedUrl();
    const back = getBackEnhancedUrl();
    if (!front) return;
    runRemainingRoofsPhase(front, back);
  }, [getFrontEnhancedUrl, getBackEnhancedUrl, runRemainingRoofsPhase]);

  const handleRegenerateFirstRoof = useCallback(() => {
    const front = getFrontEnhancedUrl();
    const back = getBackEnhancedUrl();
    if (!front) return;
    runFirstRoofPhase(front, back);
  }, [getFrontEnhancedUrl, getBackEnhancedUrl, runFirstRoofPhase]);

  // Retry only failed tasks
  const handleRetryFailed = useCallback(async () => {
    const frontUrl = getFrontEnhancedUrl();
    const backUrl = getBackEnhancedUrl();
    if (!frontUrl) return;

    dispatch({ type: "SET_ERROR", error: null });

    const failedTasks = state.tasks
      .map((t, i) => ({ ...t, index: i }))
      .filter((t) => t.status === "error" && t.taskType === "roof");

    if (failedTasks.length === 0) return;

    for (const task of failedTasks) {
      dispatch({
        type: "UPDATE_TASK",
        taskIndex: task.index,
        update: { status: "pending", error: undefined, resultUrl: undefined },
      });
    }

    const CONCURRENCY = 3;
    for (let i = 0; i < failedTasks.length; i += CONCURRENCY) {
      const batch = failedTasks.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map((task) => {
          const sourceUrl = task.side === "front" ? frontUrl : backUrl;
          if (!sourceUrl) {
            dispatch({
              type: "UPDATE_TASK",
              taskIndex: task.index,
              update: { status: "error", error: "Photo source manquante" },
            });
            return Promise.resolve();
          }
          return runSingleTask(
            sourceUrl,
            "roof",
            task.index,
            task.colorKey,
            task.roofStyle,
            state.customInstructions
          ).catch((err) => {
            dispatch({
              type: "UPDATE_TASK",
              taskIndex: task.index,
              update: {
                status: "error",
                error: err instanceof Error ? err.message : "Erreur",
              },
            });
          });
        })
      );
    }
  }, [
    state.tasks,
    state.customInstructions,
    getFrontEnhancedUrl,
    getBackEnhancedUrl,
    runSingleTask,
  ]);

  const failedCount = state.tasks.filter(
    (t) => t.status === "error" && t.taskType === "roof"
  ).length;
  const successCount = state.tasks.filter(
    (t) => t.status === "success" && t.taskType === "roof"
  ).length;

  const handleDownloadPdf = useCallback(async () => {
    dispatch({ type: "SET_PDF_LOADING", loading: true });

    try {
      // Build per-side color results
      const buildSideResults = (side: "front" | "back") => {
        const colorResults: Record<
          string,
          { waveTileUrl?: string; standingSeamUrl?: string }
        > = {};
        for (const task of state.tasks) {
          if (
            task.taskType !== "roof" ||
            task.side !== side ||
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
        return Object.entries(colorResults)
          .filter(([, v]) => v.waveTileUrl || v.standingSeamUrl)
          .map(([colorKey, v]) => ({
            colorKey,
            waveTileUrl: v.waveTileUrl,
            standingSeamUrl: v.standingSeamUrl,
          }));
      };

      const frontResults = buildSideResults("front");
      const backResults = state.hasBackPhoto ? buildSideResults("back") : [];

      if (frontResults.length === 0 && backResults.length === 0) {
        throw new Error("Aucune image reussie a inclure dans le PDF");
      }

      const frontOriginalUrl =
        state.enhancedImageUrl || state.uploadedImageUrl;
      const backOriginalUrl = state.hasBackPhoto
        ? state.backEnhancedImageUrl || state.backUploadedImageUrl
        : null;

      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalImageUrl: frontOriginalUrl,
          results: frontResults,
          backOriginalImageUrl: backOriginalUrl,
          backResults,
          clientName: state.clientName || undefined,
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
      const fileName = state.clientName
        ? `simulation-toiture-${state.clientName.replace(/\s+/g, "-").toLowerCase()}.pdf`
        : "simulation-toiture.pdf";
      a.download = fileName;
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
  }, [
    state.tasks,
    state.uploadedImageUrl,
    state.enhancedImageUrl,
    state.hasBackPhoto,
    state.backUploadedImageUrl,
    state.backEnhancedImageUrl,
    state.clientName,
  ]);

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

            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Nom du client
              </h2>
              <input
                type="text"
                value={state.clientName}
                onChange={(e) =>
                  dispatch({ type: "SET_CLIENT_NAME", name: e.target.value })
                }
                placeholder="Ex: Jean Tremblay"
                className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div className="mb-8">
              <label className="flex items-start gap-3 cursor-pointer p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={state.hasBackPhoto}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_HAS_BACK_PHOTO",
                      value: e.target.checked,
                    })
                  }
                  className="mt-1 w-4 h-4 accent-accent"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    Inclure une photo arriere{" "}
                    <span className="text-sm font-normal text-gray-500">
                      (optionnel)
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Genere aussi les variantes pour l&apos;arriere de la maison.
                    Sera ajoute en section separee a la fin du PDF.
                  </p>
                </div>
              </label>

              {state.hasBackPhoto && (
                <div className="mt-4 ml-7">
                  {state.backUploadedImagePreview ? (
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm w-48">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={state.backUploadedImagePreview}
                          alt="Photo arriere"
                          className="w-full h-auto"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          Photo arriere ajoutee
                        </p>
                        <button
                          onClick={() =>
                            dispatch({
                              type: "SET_HAS_BACK_PHOTO",
                              value: false,
                            })
                          }
                          className="text-xs text-gray-500 underline hover:text-gray-700"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ImageUploader
                      onUploaded={handleBackUploaded}
                      disablePaste={true}
                      label="Deposez la photo arriere ici"
                      compact={true}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Instructions specifiques <span className="text-sm font-normal text-gray-500">(optionnel)</span>
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Ajoutez ici des directives precises qui s&apos;appliqueront a chaque generation. Ex: &quot;revetement exterieur des lucarnes blanc&quot;, &quot;peindre les volets en noir&quot;, &quot;garage door painted dark gray&quot;, etc.
              </p>
              <textarea
                value={state.customInstructions}
                onChange={(e) =>
                  dispatch({
                    type: "SET_CUSTOM_INSTRUCTIONS",
                    instructions: e.target.value,
                  })
                }
                placeholder="Ex: Le revetement exterieur des lucarnes doit etre blanc. Les volets doivent etre repeints en noir mat."
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {state.customInstructions.length}/500
              </p>
            </div>

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

        {state.step === "checkpoint_enhanced" && (() => {
          const frontEnhTask = state.tasks.find(
            (t) => t.taskType === "enhancement" && t.side === "front"
          );
          const backEnhTask = state.tasks.find(
            (t) => t.taskType === "enhancement" && t.side === "back"
          );
          const frontError = frontEnhTask?.status === "error";
          const backError = backEnhTask?.status === "error";
          const allFailed = frontError && (state.hasBackPhoto ? backError : true);

          const SidePair = ({
            label,
            originalPreview,
            enhancedUrl,
            errored,
          }: {
            label: string;
            originalPreview: string;
            enhancedUrl: string | null;
            errored: boolean;
          }) => (
            <div className="mb-4">
              {state.hasBackPhoto && (
                <p className="text-sm font-bold text-gray-700 mb-2">{label}</p>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2 text-center">
                    Original
                  </p>
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={originalPreview}
                      alt={`${label} original`}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2 text-center">
                    {errored ? "Echec" : "Amelioree"}
                  </p>
                  {errored || !enhancedUrl ? (
                    <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 h-full min-h-[150px] flex items-center justify-center text-sm text-yellow-700 px-4 text-center">
                      L&apos;amelioration a echoue
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border-2 border-accent">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={enhancedUrl}
                        alt={`${label} amelioree`}
                        className="w-full h-auto"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );

          return (
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-700 mb-3">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  Etape 1/2 — Validation
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  L&apos;amelioration {state.hasBackPhoto ? "des photos" : "de la photo"} te convient-elle ?
                </h2>
                <p className="text-gray-500 mt-2">
                  C&apos;est {state.hasBackPhoto ? "la base" : "la photo"} qui sera utilisee pour generer toutes les variantes de toiture.
                </p>
              </div>

              <SidePair
                label="AVANT"
                originalPreview={state.uploadedImagePreview || state.uploadedImageUrl || ""}
                enhancedUrl={state.enhancedImageUrl}
                errored={frontError}
              />

              {state.hasBackPhoto && (
                <SidePair
                  label="ARRIERE"
                  originalPreview={state.backUploadedImagePreview || state.backUploadedImageUrl || ""}
                  enhancedUrl={state.backEnhancedImageUrl}
                  errored={backError}
                />
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <button
                  onClick={handleApproveEnhanced}
                  className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent-light transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={allFailed}
                >
                  Continuer avec {state.hasBackPhoto ? "ces photos" : "cette photo"}
                </button>
                <button
                  onClick={handleRegenerateEnhanced}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Refaire l&apos;amelioration
                </button>
                <button
                  onClick={handleSkipEnhanced}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Utiliser {state.hasBackPhoto ? "les originales" : "l'originale"}
                </button>
              </div>
            </div>
          );
        })()}

        {state.step === "checkpoint_first_roof" && (() => {
          const firstColor = state.selectedColors[0];
          const firstStyle = state.selectedStyles[0];
          const frontFirst = state.tasks.find(
            (t) =>
              t.taskType === "roof" &&
              t.side === "front" &&
              t.colorKey === firstColor &&
              t.roofStyle === firstStyle
          );
          const backFirst = state.tasks.find(
            (t) =>
              t.taskType === "roof" &&
              t.side === "back" &&
              t.colorKey === firstColor &&
              t.roofStyle === firstStyle
          );
          const firstColorKey = frontFirst?.colorKey;
          const styleLabel =
            frontFirst?.roofStyle === "wave_tile" ? "Tuile Onde" : "Joint Debout";
          const allFailed =
            frontFirst?.status === "error" &&
            (state.hasBackPhoto ? backFirst?.status === "error" : true);

          const SideRoof = ({
            label,
            task,
          }: {
            label: string;
            task: GenerationTask | undefined;
          }) => (
            <div>
              {state.hasBackPhoto && (
                <p className="text-sm font-bold text-gray-700 mb-2 text-center">
                  {label}
                </p>
              )}
              {task?.status === "error" ? (
                <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 min-h-[200px] flex items-center justify-center text-sm text-yellow-700 px-4 text-center">
                  Echec : {task.error || "erreur inconnue"}
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border-2 border-accent">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={task?.resultUrl || ""}
                    alt={`${label} premiere toiture`}
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
          );

          return (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-700 mb-3">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  Etape 2/2 — Validation
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {state.hasBackPhoto
                    ? "Ces premieres toitures te conviennent-elles ?"
                    : "Cette premiere toiture te convient-elle ?"}
                </h2>
                <p className="text-gray-500 mt-2">
                  Si oui, on lance les autres couleurs/styles en parallele. Sinon, ajuste les instructions et refais.
                </p>
                <p className="text-xs font-semibold text-gray-500 uppercase mt-3">
                  {firstColorKey ? `${firstColorKey} — ${styleLabel}` : ""}
                </p>
              </div>

              <div className={`mb-6 ${state.hasBackPhoto ? "grid md:grid-cols-2 gap-4" : ""}`}>
                <SideRoof label="AVANT" task={frontFirst} />
                {state.hasBackPhoto && (
                  <SideRoof label="ARRIERE" task={backFirst} />
                )}
              </div>

              {/* Inline error banner override */}
              {allFailed && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800">
                  <p className="font-semibold">
                    {state.hasBackPhoto
                      ? "Les deux premieres toitures ont echoue"
                      : "La premiere toiture a echoue"}
                  </p>
                  <p className="text-sm mt-1">Reessaie.</p>
                </div>
              )}

              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ajuster les instructions specifiques (optionnel)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Si la premiere toiture montre un probleme (ex: gouttieres qui changent), corrige ici puis clique &quot;Refaire&quot;.
                </p>
                <textarea
                  value={state.customInstructions}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_CUSTOM_INSTRUCTIONS",
                      instructions: e.target.value,
                    })
                  }
                  placeholder="Ex: gutters MUST stay white, do not change soffits"
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y bg-white"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleApproveFirstRoof}
                  disabled={allFailed}
                  className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent-light transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Continuer avec les autres
                </button>
                <button
                  onClick={handleRegenerateFirstRoof}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  {state.hasBackPhoto ? "Refaire ces toitures" : "Refaire cette toiture"}
                </button>
              </div>
            </div>
          );
        })()}

        {state.step === "results" && (
          <div>
            {failedCount > 0 && (
              <div className="max-w-3xl mx-auto mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-yellow-800 font-semibold">
                  {failedCount} generation{failedCount > 1 ? "s" : ""} echouee{failedCount > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  {successCount > 0
                    ? "Vous pouvez telecharger le PDF avec les images disponibles, ou relancer les echouees."
                    : "Aucune image n'a reussi. Relancez les generations."}
                </p>
                <button
                  onClick={handleRetryFailed}
                  className="mt-3 px-5 py-2 bg-accent text-white rounded-lg font-semibold text-sm hover:bg-accent-light transition-colors"
                >
                  Relancer les {failedCount} generation{failedCount > 1 ? "s" : ""} echouee{failedCount > 1 ? "s" : ""}
                </button>
              </div>
            )}

            <ResultsGallery tasks={state.tasks} />

            {successCount > 0 && (
              <DownloadButton
                loading={state.pdfLoading}
                onClick={handleDownloadPdf}
              />
            )}

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
