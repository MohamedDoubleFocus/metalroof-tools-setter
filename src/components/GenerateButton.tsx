"use client";

interface Props {
  disabled: boolean;
  onClick: () => void;
}

export default function GenerateButton({ disabled, onClick }: Props) {
  return (
    <div className="text-center mt-8">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          px-8 py-4 rounded-xl text-lg font-bold transition-all duration-200
          ${
            disabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-accent text-white hover:bg-accent-light shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          }
        `}
      >
        Générer les simulations
      </button>
      {disabled && (
        <p className="text-sm text-gray-400 mt-2">
          Sélectionnez 3 couleurs et au moins 1 style pour continuer
        </p>
      )}
    </div>
  );
}
