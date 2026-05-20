"use client";

import { useState } from "react";
import { KNOCKERS } from "@/lib/prospection/knockers";

interface Props {
  onSelect: (knockerId: string) => void;
}

/**
 * Full-screen modal shown on first visit (and whenever the knocker isn't
 * identified). Forces selection of one of the configured knockers.
 *
 * No close button on purpose — we WANT identification before anything else.
 */
export default function KnockerGate({ onSelect }: Props) {
  const [selected, setSelected] = useState<string>("");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">👋</div>
          <h2 className="text-2xl font-bold text-gray-900">
            Bonjour, qui es-tu ?
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            On a besoin de savoir qui logue les leads. C&apos;est gardé sur ton
            téléphone — on te le redemandera pas.
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {KNOCKERS.map((k) => (
            <button
              key={k.id}
              onClick={() => setSelected(k.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all
                ${
                  selected === k.id
                    ? "border-accent bg-red-50"
                    : "border-gray-200 hover:border-gray-300 active:bg-gray-50"
                }
              `}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                  selected === k.id
                    ? "bg-accent text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {k.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-gray-800">{k.name}</span>
              {selected === k.id && (
                <svg
                  className="w-5 h-5 text-accent ml-auto"
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
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="w-full py-4 bg-accent text-white rounded-xl font-bold text-lg hover:bg-accent-light transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Commencer
        </button>
      </div>
    </div>
  );
}
