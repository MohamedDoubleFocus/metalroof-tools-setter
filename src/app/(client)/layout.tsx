import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Votre simulation de toiture | Metal Roof Montréal",
  description:
    "Visualisez votre maison avec une nouvelle toiture en métal. Simulation personnalisée par Metal Roof Montréal.",
  robots: { index: false, follow: false },
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Premium minimalist header — branded but no navigation */}
      <header className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-bold text-lg tracking-tight">
            Metal Roof Montréal
          </div>
          <div className="text-xs text-gray-400 hidden sm:block">
            Simulation personnalisée
          </div>
        </div>
      </header>

      <main className="flex-1 py-10 px-4">{children}</main>

      <footer className="border-t border-gray-200 bg-white py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">
            Metal Roof Montréal
          </p>
          <p>metalroofmontreal.com &nbsp;|&nbsp; (514) 867-0787</p>
          <p className="mt-2 text-gray-400">
            Les images sont des simulations approximatives et peuvent différer
            du produit final installé.
          </p>
        </div>
      </footer>
    </div>
  );
}
