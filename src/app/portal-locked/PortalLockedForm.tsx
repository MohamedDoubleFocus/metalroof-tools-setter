"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PortalLockedForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/portal";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/portal-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid code");
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="password"
        autoFocus
        autoComplete="off"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Access code"
        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:border-slate-600 focus:outline-none text-center tracking-widest font-mono"
      />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold text-base hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Verifying…" : "Continue"}
      </button>
    </form>
  );
}
