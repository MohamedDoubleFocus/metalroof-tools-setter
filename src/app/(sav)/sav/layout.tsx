"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SAV_NAV = [
  { href: "/sav", label: "Accueil" },
  { href: "/sav/garantie", label: "Certificat de garantie" },
];

export default function SavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-2">
        <Link href="/" className="text-xs text-gray-500 hover:text-accent">
          ← Tous les outils
        </Link>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">
        Service après vente
      </h1>
      <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2">
        {SAV_NAV.map((item) => {
          const isActive =
            item.href === "/sav"
              ? pathname === "/sav"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm whitespace-nowrap px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
