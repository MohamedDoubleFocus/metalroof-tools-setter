"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/chantiers", label: "Pipeline", match: (p: string) => p === "/chantiers" },
  { href: "/chantiers/list", label: "Liste", match: (p: string) => p === "/chantiers/list" },
  { href: "/chantiers/map", label: "Carte", match: (p: string) => p === "/chantiers/map" },
];

export default function ViewSwitch() {
  const pathname = usePathname() ?? "";
  return (
    <div className="inline-flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 sm:flex-none text-center px-3 sm:px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
