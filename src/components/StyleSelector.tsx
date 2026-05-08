"use client";

import type { RoofStyle } from "@/types";

interface Props {
  selectedStyles: RoofStyle[];
  onToggle: (style: RoofStyle) => void;
}

const STYLES: { key: RoofStyle; label: string; description: string }[] = [
  {
    key: "wave_tile",
    label: "Tuile Ondulée Européenne",
    description:
      "Toiture en acier avec profil en S continu, fini émail semi-lustré",
  },
  {
    key: "standing_seam",
    label: "Joint Debout",
    description:
      "Panneaux d'acier lisses avec joints verticaux espacés de 14 pouces",
  },
  {
    key: "shingle_tile",
    label: "Tuile Écaille Européenne",
    description:
      "Bardeaux métalliques estampés en écailles arrondies, rangées décalées, fini mat",
  },
];

export default function StyleSelector({ selectedStyles, onToggle }: Props) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-gray-800 mb-2">
        Choisissez le(s) style(s) de toiture
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Sélectionnez un ou plusieurs styles à appliquer sur chaque couleur.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {STYLES.map((style) => {
          const isSelected = selectedStyles.includes(style.key);
          return (
            <button
              key={style.key}
              onClick={() => onToggle(style.key)}
              className={`
                relative flex flex-col gap-2 p-5 rounded-xl border-2 text-left
                transition-all duration-200
                ${
                  isSelected
                    ? "border-accent bg-red-50 shadow-md"
                    : "border-gray-200 hover:border-gray-400 hover:shadow-sm"
                }
              `}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}

              <span className="text-sm font-bold text-gray-800">
                {style.label}
              </span>
              <span className="text-xs text-gray-500">
                {style.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 text-center text-sm text-gray-500">
        {selectedStyles.length === 0
          ? "Sélectionnez au moins un style"
          : `${selectedStyles.length} style${selectedStyles.length > 1 ? "s" : ""} sélectionné${selectedStyles.length > 1 ? "s" : ""}`}
      </div>
    </div>
  );
}
