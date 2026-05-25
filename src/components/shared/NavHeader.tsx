"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Accueil" },
  { href: "/roof-simulator", label: "Simulateur" },
  { href: "/booking", label: "Rendez-vous" },
  { href: "/prospection", label: "Prospection" },
];

export default function NavHeader() {
  const pathname = usePathname();

  // Hide the internal navigation on the client-facing portal — clients should
  // never see links to the booking tool, internal simulator, or homepage.
  // Also hide on /prospection because it uses its own mobile-first chrome
  // (top bar + bottom nav) and the global nav would steal vertical space.
  // CRITICAL: also hide on the freelancer portal — that side is white-labeled
  // and must NEVER show Metal Roof Montréal branding.
  if (
    pathname.startsWith("/client") ||
    pathname.startsWith("/prospection") ||
    pathname.startsWith("/portal") ||
    pathname === "/portal-locked"
  ) {
    return null;
  }

  return (
    <nav className="bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Metal Roof Montreal
        </Link>
        <div className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  isActive
                    ? "text-white font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
