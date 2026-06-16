"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfileState } from "@/lib/auth/use-me";
import { useT } from "@/lib/i18n/context";
import LanguageToggle from "./LanguageToggle";

export default function NavHeader() {
  const pathname = usePathname();
  const { profile, loaded } = useProfileState();
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const NAV_ITEMS = [
    { href: "/", label: t("nav.home") },
    { href: "/roof-simulator", label: t("nav.simulator") },
    { href: "/booking", label: t("nav.booking") },
    { href: "/prospection", label: t("nav.prospection") },
  ];

  if (
    pathname.startsWith("/client") ||
    pathname.startsWith("/prospection") ||
    pathname.startsWith("/portal") ||
    pathname === "/portal-locked" ||
    pathname === "/login"
  ) {
    return null;
  }

  if (!loaded) return null;
  if (profile && (profile.role === "foreman" || profile.role === "sdr")) {
    return null;
  }

  return (
    <nav className="bg-black text-white sticky top-0 z-40 shadow">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 flex items-center justify-between h-14 gap-2">
        {/* Logo */}
        <Link
          href="/"
          className="font-bold text-sm sm:text-lg tracking-tight truncate shrink-0"
        >
          <span className="sm:hidden">MRM</span>
          <span className="hidden sm:inline">Metal Roof Montreal</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
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

        {/* Right cluster — always visible */}
        <div className="flex items-center gap-2 shrink-0">
          <LanguageToggle variant="dark" />

          {/* Desktop logout */}
          {profile && (
            <form action="/logout" method="post" className="hidden md:block">
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {t("common.logout")}
              </button>
            </form>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black">
          <div className="max-w-6xl mx-auto px-3 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-3 rounded-lg text-base font-semibold transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {profile && (
              <form action="/logout" method="post" className="pt-2">
                <button
                  type="submit"
                  className="w-full px-3 py-3 text-base font-semibold bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left"
                >
                  {t("common.logout")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
