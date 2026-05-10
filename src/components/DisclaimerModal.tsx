"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal shown right when the client clicks "Générer" — sets expectations
 * about the AI nature of the simulation in a warm, reassuring tone before
 * launching the generation pipeline.
 */
export default function DisclaimerModal({ open, onConfirm, onCancel }: Props) {
  // Lock body scroll while the modal is open
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-3xl">
            🏠
          </div>
        </div>

        <h2
          id="disclaimer-title"
          className="mb-3 text-center text-xl font-bold text-gray-900 sm:text-2xl"
        >
          Avant de lancer votre simulation
        </h2>

        <p className="mb-2 text-center text-sm leading-relaxed text-gray-600 sm:text-base">
          Notre simulation utilise l&apos;intelligence artificielle pour vous
          donner un aperçu très fidèle de votre future toiture.
        </p>

        <p className="mb-6 text-center text-sm leading-relaxed text-gray-600 sm:text-base">
          De légères variations sont possibles avec l&apos;installation finale —
          le rendu réel sera encore plus beau&nbsp;! ✨
        </p>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
          >
            J&apos;ai compris, lancer
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}
