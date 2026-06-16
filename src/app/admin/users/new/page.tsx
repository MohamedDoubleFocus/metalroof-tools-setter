"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CHANTIER_TEAMS, type ChantierTeam } from "@/types/chantiers";

type Role = "admin" | "foreman" | "sdr";

function generatePassword(): string {
  // 12 chars, mix letters + digits + symbols (no ambiguous chars)
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export default function NewUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("foreman");
  const [team, setTeam] = useState<ChantierTeam | "">("");
  const [password, setPassword] = useState(generatePassword());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim() || undefined,
          role,
          team: team || null,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setResult({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-8">
        <div className="max-w-xl mx-auto bg-white border-2 border-green-200 rounded-2xl p-6 space-y-4">
          <div className="text-3xl">✅</div>
          <h1 className="text-xl font-bold text-gray-900">Compte créé</h1>
          <p className="text-sm text-gray-700">
            Transmets ces credentials à l&apos;employé (verbalement, SMS, ou
            email sécurisé). Il pourra se connecter immédiatement et changer
            son mot de passe par la suite (à venir).
          </p>
          <div className="space-y-2 bg-gray-50 p-4 rounded-xl">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase">
                Email
              </div>
              <div className="font-mono text-sm select-all">{result.email}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase">
                Mot de passe
              </div>
              <div className="font-mono text-sm select-all">
                {result.password}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/admin/users")}
              className="px-4 py-2 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light"
            >
              Retour à la liste
            </button>
            <button
              onClick={() => {
                setResult(null);
                setEmail("");
                setFullName("");
                setTeam("");
                setRole("foreman");
                setPassword(generatePassword());
              }}
              className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:border-accent"
            >
              + Créer un autre
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-8">
      <div className="max-w-xl mx-auto space-y-4">
        <Link
          href="/admin/users"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Retour
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">Nouvel utilisateur</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4"
        >
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 block mb-1">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
              placeholder="prenom@metalroofmontreal.ca"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700 block mb-1">
              Nom complet (optionnel)
            </span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
              placeholder="Pavel Ivanov"
            />
          </label>

          <div>
            <span className="text-sm font-semibold text-gray-700 block mb-1">
              Rôle
            </span>
            <div className="flex gap-2 flex-wrap">
              {(["admin", "foreman", "sdr"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 ${
                    role === r
                      ? "border-accent bg-white text-gray-900"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {r === "admin"
                    ? "Admin"
                    : r === "foreman"
                      ? "Foreman"
                      : "SDR"}
                </button>
              ))}
            </div>
          </div>

          {role === "foreman" && (
            <label className="block">
              <span className="text-sm font-semibold text-gray-700 block mb-1">
                Équipe par défaut (optionnel)
              </span>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value as ChantierTeam | "")}
                disabled={submitting}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base bg-white focus:border-accent focus:outline-none"
              >
                <option value="">Aucune équipe par défaut</option>
                {CHANTIER_TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-gray-700 block mb-1">
              Mot de passe initial
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-base font-mono focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                disabled={submitting}
                className="px-3 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm hover:border-accent"
                title="Regénérer"
              >
                🎲
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              L&apos;employé recevra ce mot de passe et pourra le changer après
              connexion.
            </p>
          </label>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="w-full py-3 bg-accent text-white rounded-xl font-bold text-base hover:bg-accent-light disabled:bg-gray-300"
          >
            {submitting ? "Création..." : "Créer le compte"}
          </button>
        </form>
      </div>
    </div>
  );
}
