"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useT } from "@/lib/i18n/context";
import LanguageToggle from "@/components/shared/LanguageToggle";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") || null;
  const { t } = useT();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(t("auth.login.error.invalid"));
        setSubmitting(false);
        return;
      }

      const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";
      window.location.href = target;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-8 relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-sm bg-white border-2 border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("auth.login.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t("auth.login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1">
              {t("auth.login.email")}
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
              placeholder="prenom@metalroofmontreal.ca"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1">
              {t("auth.login.password")}
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
            />
          </label>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="w-full py-3 bg-accent text-white rounded-xl font-bold text-base hover:bg-accent-light disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? t("auth.login.submitting") : t("auth.login.submit")}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          {t("auth.login.forgotPassword")}
        </p>
      </div>
    </div>
  );
}
