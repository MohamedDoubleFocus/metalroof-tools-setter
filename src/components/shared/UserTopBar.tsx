"use client";

import Link from "next/link";
import { useProfileState } from "@/lib/auth/use-me";
import LanguageToggle from "./LanguageToggle";
import { useT } from "@/lib/i18n/context";

/**
 * Minimal top bar shown to foreman + SDR (NavHeader is hidden for them).
 * Provides: branding, language toggle, logout. Mobile-first.
 */
export default function UserTopBar() {
  const { profile, loaded } = useProfileState();
  const { t } = useT();

  if (!loaded) return null;
  if (!profile) return null;
  if (profile.role === "admin") return null;

  return (
    <header className="bg-black text-white sticky top-0 z-30 shadow">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 flex items-center justify-between h-14 gap-2">
        <Link
          href={profile.role === "sdr" ? "/prospection" : "/chantiers"}
          className="font-bold text-sm sm:text-base tracking-tight truncate"
        >
          Metal Roof Montréal
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle variant="dark" />
          <form action="/logout" method="post">
            <button
              type="submit"
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              {t("common.logout")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
