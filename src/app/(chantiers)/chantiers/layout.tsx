import Link from "next/link";

export const metadata = {
  title: "Suivi de chantiers | Metal Roof Montréal",
};

export default function ChantiersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="font-bold text-base sm:text-lg tracking-tight hover:text-gray-200 truncate"
          >
            <span className="sm:hidden">← Outils MTM</span>
            <span className="hidden sm:inline">← Outils Metal Roof Montréal</span>
          </Link>
          <div className="text-xs text-gray-400 hidden sm:block shrink-0">
            Suivi de chantiers
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">
            Metal Roof Montréal
          </p>
          <p>metalroofmontreal.ca &nbsp;|&nbsp; (514) 867-0787</p>
        </div>
      </footer>
    </div>
  );
}
