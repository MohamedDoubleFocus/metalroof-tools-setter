"use client";

import { useT } from "@/lib/i18n/context";

interface Props {
  variant?: "light" | "dark";
}

export default function LanguageToggle({ variant = "light" }: Props) {
  const { locale, setLocale } = useT();
  const isFr = locale === "fr";

  const base =
    "inline-flex items-center rounded-full text-xs font-bold uppercase tracking-wide select-none transition-colors overflow-hidden border";
  const styles =
    variant === "dark"
      ? "border-gray-600 bg-gray-800/40"
      : "border-gray-300 bg-white";

  const buttonBase =
    "px-3 py-1.5 cursor-pointer transition-colors min-w-[2.5rem] text-center";
  const activeStyles =
    variant === "dark"
      ? "bg-white text-gray-900"
      : "bg-accent text-white";
  const inactiveStyles =
    variant === "dark"
      ? "text-gray-300 hover:text-white"
      : "text-gray-500 hover:text-gray-700";

  return (
    <div className={`${base} ${styles}`} aria-label="Language toggle">
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={`${buttonBase} ${isFr ? activeStyles : inactiveStyles}`}
        aria-pressed={isFr}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`${buttonBase} ${!isFr ? activeStyles : inactiveStyles}`}
        aria-pressed={!isFr}
      >
        EN
      </button>
    </div>
  );
}
