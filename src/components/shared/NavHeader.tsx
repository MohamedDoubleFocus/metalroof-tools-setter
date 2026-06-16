"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMyProfile } from "@/lib/auth/use-me";
import { useT } from "@/lib/i18n/context";
import LanguageToggle from "./LanguageToggle";

export default function NavHeader() {
  const pathname = usePathname();
  const profile = useMyProfile();
  const { t } = useT();

  const NAV_ITEMS = [
    { href: "/", label: t("nav.home") },
    { href: "/roof-simulator", label: t("nav.simulator") },
    { href: "/booking", label: t("nav.booking") },
    { href: "/prospection", label: t("nav.prospection") },
  ];

  // Hide on client portal + freelancer + prospection (own chrome)
  if (
    pathname.startsWith("/client") ||
    pathname.startsWith("/prospection") ||
    pathname.startsWith("/portal") ||
    pathname === "/portal-locked" ||
    pathname === "/login" ||
    pathname === "/portal-locked"
  ) {
    return null;
  }

  // Hide the global nav for foreman + SDR — they have their own focused UI
  // (foreman: chantiers only; SDR: prospection only). Showing them the global
  // nav with broken links would just confuse.
  if (profile && (profile.role === "foreman" || profile.role === "sdr")) {
    return null;
  }

  return (
    <nav className="bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 gap-3">
        <Link href="/" className="font-bold text-base sm:text-lg tracking-tight truncate">
          Metal Roof Montreal
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex items-center gap-6">
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
          <LanguageToggle variant="dark" />
          {profile && (
            <form action="/logout" method="post" className="hidden sm:block">
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {t("common.logout")}
              </button>
            </form>
          )}
        </div>
      </div>
    </nav>
  );
}
