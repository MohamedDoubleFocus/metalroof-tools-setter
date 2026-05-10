"use client";

import { COLORS } from "@/lib/colors";
import type { GenerationTask } from "@/types";

interface Props {
  tasks: GenerationTask[];
}

const STYLE_LABELS: Record<string, string> = {
  wave_tile: "Tuile Ondulée",
  standing_seam: "Joint Debout",
  shingle_tile: "Style européen",
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return (
        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    case "error":
      return (
        <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      );
    case "pending":
      return (
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-gray-400 rounded-full" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
      );
  }
}

export default function ProgressPanel({ tasks }: Props) {
  const completed = tasks.filter((t) => t.status === "success").length;
  const total = tasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  // Separate enhancement task from roof tasks
  const enhancementTasks = tasks.filter((t) => t.taskType === "enhancement");
  const roofTasks = tasks.filter((t) => t.taskType === "roof");
  const hasBack = tasks.some((t) => t.side === "back");

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-2">
        Génération en cours...
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        {completed}/{total} étapes complétées — Veuillez patienter, cela peut
        prendre quelques minutes.
      </p>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Enhancement tasks */}
      {enhancementTasks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Étape 1 — Amélioration {hasBack ? "des photos" : "de la photo"}
          </h3>
          <div className="space-y-3">
            {enhancementTasks.map((enhancementTask, i) => (
              <div
                key={i}
                className={`
                  p-4 rounded-xl border-2 transition-all duration-300
                  ${
                    enhancementTask.status === "success"
                      ? "border-green-300 bg-green-50"
                      : enhancementTask.status === "error"
                      ? "border-red-300 bg-red-50"
                      : enhancementTask.status === "pending"
                      ? "border-gray-200 bg-white"
                      : "border-accent/30 bg-red-50/30"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-green-400 rounded-full flex items-center justify-center text-white text-sm">
                    ✨
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      Amélioration curb appeal
                      {hasBack && (
                        <span className="ml-2 text-xs font-normal px-2 py-0.5 bg-gray-100 rounded">
                          {enhancementTask.side === "front" ? "Avant" : "Arrière"}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      Ciel bleu, pelouse verte, éclairage professionnel
                    </p>
                  </div>
                  <StatusIcon status={enhancementTask.status} />
                </div>
                {enhancementTask.error && (
                  <p className="text-xs text-red-600 mt-2">
                    {enhancementTask.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roof tasks */}
      <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
        Étape 2 — Génération des toitures
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roofTasks.map((task, i) => {
          const color = COLORS[task.colorKey];
          return (
            <div
              key={i}
              className={`
                p-4 rounded-xl border-2 transition-all duration-300
                ${
                  task.status === "success"
                    ? "border-green-300 bg-green-50"
                    : task.status === "error"
                    ? "border-red-300 bg-red-50"
                    : task.status === "pending"
                    ? "border-gray-200 bg-white"
                    : "border-accent/30 bg-red-50/30"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border border-gray-300 shrink-0"
                  style={{ backgroundColor: color?.hex }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {color?.frenchName}
                    {hasBack && (
                      <span className="ml-1 text-[10px] font-normal px-1.5 py-0.5 bg-gray-100 rounded">
                        {task.side === "front" ? "Av" : "Ar"}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {STYLE_LABELS[task.roofStyle]}
                  </p>
                </div>
                <StatusIcon status={task.status} />
              </div>
              {task.error && (
                <p className="text-xs text-red-600 mt-2">{task.error}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
