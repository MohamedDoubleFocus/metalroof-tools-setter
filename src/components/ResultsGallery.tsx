"use client";

import { COLORS } from "@/lib/colors";
import type { GenerationTask } from "@/types";

interface Props {
  tasks: GenerationTask[];
}

const STYLE_LABELS: Record<string, string> = {
  wave_tile: "Tuile Ondulée Européenne",
  standing_seam: "Joint Debout",
};

export default function ResultsGallery({ tasks }: Props) {
  const successTasks = tasks.filter((t) => t.status === "success");

  // Group by color
  const colorGroups: Record<
    string,
    { waveTile?: GenerationTask; standingSeam?: GenerationTask }
  > = {};
  for (const task of successTasks) {
    if (!colorGroups[task.colorKey]) {
      colorGroups[task.colorKey] = {};
    }
    if (task.roofStyle === "wave_tile") {
      colorGroups[task.colorKey].waveTile = task;
    } else {
      colorGroups[task.colorKey].standingSeam = task;
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        Vos simulations de toiture
      </h2>

      {Object.entries(colorGroups).map(([colorKey, group]) => {
        const color = COLORS[colorKey];
        return (
          <div key={colorKey} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-6 h-6 rounded-full border border-gray-300"
                style={{ backgroundColor: color?.hex }}
              />
              <h3 className="text-lg font-bold text-gray-800">
                {color?.frenchName}
                {color?.ral !== "N/A" && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    {color?.ral}
                  </span>
                )}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.waveTile?.resultUrl && (
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={group.waveTile.resultUrl}
                    alt={`${color?.frenchName} - Tuile Ondulée`}
                    className="w-full h-auto"
                  />
                  <div className="p-3 bg-white text-center">
                    <p className="text-sm font-semibold text-gray-700">
                      {STYLE_LABELS.wave_tile}
                    </p>
                  </div>
                </div>
              )}
              {group.standingSeam?.resultUrl && (
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={group.standingSeam.resultUrl}
                    alt={`${color?.frenchName} - Joint Debout`}
                    className="w-full h-auto"
                  />
                  <div className="p-3 bg-white text-center">
                    <p className="text-sm font-semibold text-gray-700">
                      {STYLE_LABELS.standing_seam}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
