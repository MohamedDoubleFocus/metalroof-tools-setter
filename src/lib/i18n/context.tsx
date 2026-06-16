"use client";

/**
 * Lightweight i18n provider — no external library.
 *
 * Persists the chosen locale in localStorage + a cookie (so SSR could
 * read it eventually). Defaults to French.
 *
 * Usage in any client component:
 *
 *   const { t, locale, setLocale } = useT();
 *   <h1>{t("chantiers.title")}</h1>
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { dict, LOCALES, type Locale, type TranslationKey } from "./dictionary";

const STORAGE_KEY = "mrm-locale";
const COOKIE_KEY = "mrm-locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readInitial(): Locale {
  if (typeof window === "undefined") return "fr";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (LOCALES as string[]).includes(stored)) return stored as Locale;
  } catch {
    // ignore
  }
  return "fr";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    setLocaleState(readInitial());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.cookie = `${COOKIE_KEY}=${l}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const table = dict[locale] as Record<string, string>;
      const fallback = dict.fr as Record<string, string>;
      return table[key] ?? fallback[key] ?? key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Graceful fallback so non-wrapped components don't crash during SSR
    return {
      locale: "fr",
      setLocale: () => {},
      t: (key) => (dict.fr as Record<string, string>)[key] ?? key,
    };
  }
  return ctx;
}
