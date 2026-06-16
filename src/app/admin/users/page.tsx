"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "foreman" | "sdr";
  team: string | null;
  created_at: string;
}

const ROLE_LABEL: Record<UserProfile["role"], string> = {
  admin: "Admin",
  foreman: "Foreman",
  sdr: "SDR",
};

const ROLE_TONE: Record<UserProfile["role"], string> = {
  admin: "bg-amber-100 text-amber-900 border-amber-300",
  foreman: "bg-blue-100 text-blue-900 border-blue-300",
  sdr: "bg-emerald-100 text-emerald-900 border-emerald-300",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cet utilisateur ?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || "Erreur");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="font-bold text-base sm:text-lg hover:text-gray-200 truncate"
          >
            <span className="sm:hidden">← Outils MTM</span>
            <span className="hidden sm:inline">← Outils Metal Roof Montréal</span>
          </Link>
          <div className="text-xs text-gray-400 hidden sm:block">Admin</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Gestion des utilisateurs
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Créer / éditer / supprimer les accès employés.
            </p>
          </div>
          <Link
            href="/admin/users/new"
            className="px-4 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light"
          >
            + Nouvel utilisateur
          </Link>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-gray-400">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Aucun utilisateur. Crée le premier.
          </div>
        ) : (
          <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Rôle</th>
                  <th className="px-3 py-2 text-left">Équipe</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-semibold">
                      {u.full_name || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{u.email}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${ROLE_TONE[u.role]}`}
                      >
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{u.team || "—"}</td>
                    <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-xs text-gray-500 hover:text-accent"
                      >
                        Éditer
                      </Link>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
