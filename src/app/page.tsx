import ToolCard from "@/components/shared/ToolCard";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Metal Roof Montreal
            </h1>
            <p className="text-gray-500">
              Outils internes pour l&apos;equipe
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ToolCard
              href="/roof-simulator"
              title="Simulateur de Toiture IA"
              description="Generez des simulations de toiture metallique a partir d'une photo ou d'une adresse. Choisissez vos couleurs et styles, puis telecharger le PDF."
              icon={
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
              }
            />
            <ToolCard
              href="/booking"
              title="Outil de Rendez-vous"
              description="Optimisez vos rendez-vous en fonction de la geographie. Trouvez les meilleurs creneaux pour minimiser le temps de deplacement."
              icon={
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              }
            />
          </div>
        </div>
      </main>

      <footer className="bg-gray-100 border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        <p>Metal Roof Montreal | metalroofmontreal.ca | (514) 867-0787</p>
      </footer>
    </div>
  );
}
