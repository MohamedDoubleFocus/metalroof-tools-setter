import { Suspense } from "react";
import LockedForm from "./LockedForm";

export const dynamic = "force-dynamic";

export default function LockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 bg-accent/10 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 11c0-1.657 1.343-3 3-3s3 1.343 3 3v2m-6 0h6m-6 0v6a2 2 0 002 2h2a2 2 0 002-2v-6M9 11V7a4 4 0 118 0v4m-9 0h10"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Accès protégé</h1>
          <p className="text-sm text-gray-500 mt-1">
            Entrez le code d&apos;accès pour utiliser les outils internes.
          </p>
        </div>

        <Suspense fallback={null}>
          <LockedForm />
        </Suspense>

        <p className="text-center text-xs text-gray-400 mt-6">
          Toiture Métallique Montréal · Outils internes
        </p>
      </div>
    </div>
  );
}
