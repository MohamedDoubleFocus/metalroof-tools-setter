"use client";

import type { InputMode } from "@/types";

interface Props {
  onSelect: (mode: InputMode) => void;
}

export default function InputModeSelector({ onSelect }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          Comment souhaitez-vous commencer ?
        </h2>
        <p className="text-gray-500 mt-2">
          Entrez une adresse ou téléchargez directement une photo de votre
          maison
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button
          onClick={() => onSelect("address")}
          className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-gray-200 hover:border-accent hover:bg-red-50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
        >
          <div className="text-5xl">📍</div>
          <h3 className="text-lg font-bold text-gray-800 group-hover:text-accent">
            Entrer une adresse
          </h3>
          <p className="text-sm text-gray-500 text-center">
            Nous récupérerons automatiquement une photo via Google Street View
          </p>
        </button>

        <button
          onClick={() => onSelect("upload")}
          className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-gray-200 hover:border-accent hover:bg-red-50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
        >
          <div className="text-5xl">📷</div>
          <h3 className="text-lg font-bold text-gray-800 group-hover:text-accent">
            Télécharger une photo
          </h3>
          <p className="text-sm text-gray-500 text-center">
            Déposez votre propre photo de maison
          </p>
        </button>
      </div>
    </div>
  );
}
