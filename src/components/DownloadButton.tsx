"use client";

interface Props {
  loading: boolean;
  onClick: () => void;
}

export default function DownloadButton({ loading, onClick }: Props) {
  return (
    <div className="text-center mt-8">
      <button
        onClick={onClick}
        disabled={loading}
        className={`
          px-8 py-4 rounded-xl text-lg font-bold transition-all duration-200
          ${
            loading
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-accent text-white hover:bg-accent-light shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          }
        `}
      >
        {loading ? (
          <span className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Création du PDF...
          </span>
        ) : (
          "Télécharger le PDF"
        )}
      </button>
      <p className="text-sm text-gray-500 mt-2">
        Document professionnel avec toutes vos simulations
      </p>
    </div>
  );
}
