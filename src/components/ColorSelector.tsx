"use client";

import { COLORS, COLOR_KEYS } from "@/lib/colors";

interface Props {
  selectedColors: string[];
  onToggle: (colorKey: string) => void;
}

export default function ColorSelector({ selectedColors, onToggle }: Props) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-800 mb-2">
        Choisissez vos couleurs
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Sélectionnez les couleurs pour générer vos simulations de toiture.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {COLOR_KEYS.map((key) => {
          const color = COLORS[key];
          const isSelected = selectedColors.includes(key);
          const selectionIndex = selectedColors.indexOf(key);
          const isFull = false;

          return (
            <button
              key={key}
              onClick={() => onToggle(key)}
              disabled={isFull}
              className={`
                relative flex flex-col items-center gap-2 p-4 rounded-xl border-2
                transition-all duration-200
                ${
                  isSelected
                    ? "border-accent bg-red-50 shadow-md scale-[1.02]"
                    : isFull
                    ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                    : "border-gray-200 hover:border-gray-400 hover:shadow-sm cursor-pointer"
                }
              `}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {selectionIndex + 1}
                </div>
              )}

              <div
                className="w-14 h-14 rounded-full border-2 border-gray-300 shadow-inner"
                style={{ backgroundColor: color.hex }}
              />

              <span className="text-sm font-semibold text-gray-800">
                {color.frenchName}
              </span>

              <span className="text-xs text-gray-500">
                {color.ral !== "N/A" ? color.ral : color.hex}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-center text-sm text-gray-500">
        {selectedColors.length} couleur{selectedColors.length !== 1 ? "s" : ""} sélectionnée{selectedColors.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
