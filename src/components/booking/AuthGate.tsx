"use client";

import { useSession, signIn } from "next-auth/react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Connexion requise
          </h2>
          <p className="text-gray-500 mb-6 max-w-md">
            Connectez-vous avec votre compte Google pour acceder a votre
            calendrier et optimiser vos rendez-vous.
          </p>
          <button
            onClick={() => signIn("google")}
            className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent-light transition-colors"
          >
            Se connecter avec Google
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
