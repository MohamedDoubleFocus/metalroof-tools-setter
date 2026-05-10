import { getCodeMeta } from "@/lib/kv";
import { isValidCodeFormat } from "@/lib/codes";
import ClientErrorPage from "../ClientErrorPage";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function MerciPage({ params }: PageProps) {
  const { code } = await params;

  if (!isValidCodeFormat(code)) {
    return (
      <ClientErrorPage
        title="Lien invalide"
        message="Ce lien n'est pas valide. Vérifiez le lien reçu par SMS ou contactez votre représentant Metal Roof Montréal."
      />
    );
  }

  const meta = await getCodeMeta(code);
  const firstName = meta?.clientName?.split(/\s+/)[0] || "";
  const hasEmail = Boolean(meta?.email);

  return (
    <div className="max-w-xl mx-auto px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-10 text-center mt-8">
        {/* Animated check icon */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-accent/10 rounded-full animate-pulse" />
          <div className="relative w-20 h-20 bg-accent rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
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
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Merci{firstName ? `, ${firstName}` : ""} !
        </h1>

        <p className="text-gray-700 leading-relaxed mb-2">
          Votre simulation est en cours de génération.
        </p>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Cela peut prendre <strong>3 à 8 minutes</strong>.
          Vous pouvez fermer cette page sans problème.
        </p>

        <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 text-left">
          <p className="text-sm font-bold text-gray-800 mb-3 text-center">
            Vous recevrez bientôt :
          </p>
          <ul className="space-y-2.5 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-accent mt-0.5">📱</span>
              <span>
                Un <strong>SMS</strong> avec le lien vers votre simulation
                personnalisée
              </span>
            </li>
            {hasEmail && (
              <li className="flex items-start gap-3">
                <span className="text-accent mt-0.5">✉️</span>
                <span>
                  Un <strong>courriel</strong> avec le même lien, pour le
                  retrouver facilement
                </span>
              </li>
            )}
            <li className="flex items-start gap-3">
              <span className="text-accent mt-0.5">🏠</span>
              <span>
                Vos images de toiture personnalisées, prêtes à être consultées
                et téléchargées en PDF
              </span>
            </li>
          </ul>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Une question ? Appelez-nous au{" "}
            <a
              href="tel:5148670787"
              className="font-semibold text-accent hover:underline"
            >
              (514) 867-0787
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
