"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
        <Image
          src="/logo.webp"
          alt="Metal Roof Montreal"
          width={140}
          height={85}
          className="h-12 w-auto"
          priority
        />
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Simulateur de Toiture Métallique
          </h1>
          <p className="text-xs text-gray-400">
            Visualisez votre projet en quelques clics
          </p>
        </div>
      </div>
    </header>
  );
}
