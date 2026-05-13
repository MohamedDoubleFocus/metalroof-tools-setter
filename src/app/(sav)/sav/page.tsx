import Link from "next/link";

export default function SavHomePage() {
  return (
    <div>
      <p className="text-gray-500 text-sm mb-6">
        Outils dédiés au suivi client après installation.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/sav/garantie"
          className="group block bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
        >
          <div className="text-accent mb-3">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-accent transition-colors">
            Certificat de garantie
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Générer et envoyer par courriel le certificat de garantie limitée
            transférable de 50 ans au client.
          </p>
        </Link>
      </div>
    </div>
  );
}
