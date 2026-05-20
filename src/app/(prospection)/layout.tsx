import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prospection — Metal Roof Montreal",
  description: "Outil de gestion des leads door-to-door pour l'équipe.",
  robots: { index: false, follow: false },
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function ProspectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Note: pas de NavHeader public ici — NavHeader.tsx checke pathname et
  // se cache sur /prospection (modification dans la prochaine étape).
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Padding bottom pour compenser la bottom nav fixe */}
      <div className="pb-24">{children}</div>
    </div>
  );
}
