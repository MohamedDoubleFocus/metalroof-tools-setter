"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ChantierStatusBadge from "@/components/chantiers/ChantierStatusBadge";
import ChantierActions from "@/components/chantiers/ChantierActions";
import ChantierTimeline from "@/components/chantiers/ChantierTimeline";
import UrgencyBadge from "@/components/chantiers/UrgencyBadge";
import TeamBadge from "@/components/chantiers/TeamBadge";
import ChantierPhotos from "@/components/chantiers/ChantierPhotos";
import { useTeamChiefNames } from "@/lib/teams/use-teams";
import { useMyProfile } from "@/lib/auth/use-me";
import { useT } from "@/lib/i18n/context";
import { COLORS, COLOR_KEYS } from "@/lib/colors";
import {
  CHANTIER_TEAMS,
  type Chantier,
  type ChantierStatus,
  type ChantierStyle,
  type ChantierUrgency,
} from "@/types/chantiers";

const STATUSES: ChantierStatus[] = ["scheduled", "in_progress", "done"];

export default function ChantierDetailPage() {
  const { t } = useT();
  const STATUS_LABEL: Record<ChantierStatus, string> = {
    scheduled: t("chantier.status.scheduled"),
    in_progress: t("chantier.status.in_progress"),
    done: t("chantier.status.done"),
  };
  const STYLE_LABEL: Record<ChantierStyle, string> = {
    shingle_tile: t("chantier.style.shingle_tile"),
    standing_seam: t("chantier.style.standing_seam"),
  };
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const chiefNames = useTeamChiefNames();
  const profile = useMyProfile();
  const isAdmin = profile?.role === "admin";
  const isForeman = profile?.role === "foreman";
  const readOnly = isForeman; // foreman can't edit anything except photos
  const hideSubmission = isForeman;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/chantiers/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setChantier(data.chantier);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const patch = async (
    field: string,
    body: Record<string, unknown>
  ): Promise<void> => {
    if (readOnly) return; // foreman: no writes
    setSavingField(field);
    try {
      const res = await fetch(`/api/chantiers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur");
        return;
      }
      setChantier(data.chantier);
    } finally {
      setSavingField(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("chantier.delete.confirm"))) return;
    const res = await fetch(`/api/chantiers/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/chantiers");
    } else {
      alert("Suppression échouée");
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-400">{t("common.loading")}</div>;
  }
  if (error || !chantier) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error || t("chantier.notFound")}
        </div>
        <Link
          href="/chantiers"
          className="block mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          {t("chantier.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/chantiers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {t("chantier.back")}
        </Link>
      </div>

      {/* ─── Header card ──────────────────────────────────────────── */}
      <div
        className={`border-2 rounded-2xl p-4 sm:p-5 space-y-2 ${
          chantier.urgency === "urgent"
            ? "bg-red-50 border-red-300"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
            {chantier.clientName}
          </h1>
          <ChantierStatusBadge status={chantier.status} />
          <UrgencyBadge urgency={chantier.urgency} />
          <TeamBadge
            team={chantier.team}
            chiefName={chantier.team ? chiefNames[chantier.team] : undefined}
          />
        </div>
        <div className="text-sm text-gray-700">
          {chantier.addressLine1}
          {chantier.addressLine2 && (
            <>
              <br />
              {chantier.addressLine2}
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap pt-2 border-t border-gray-100">
          <a
            href={`tel:${chantier.clientPhone}`}
            className="hover:text-accent underline-offset-2 hover:underline"
          >
            📞 {chantier.clientPhone}
          </a>
          {chantier.clientEmail ? (
            <a
              href={`mailto:${chantier.clientEmail}`}
              className="hover:text-accent underline-offset-2 hover:underline"
            >
              ✉️ {chantier.clientEmail}
            </a>
          ) : (
            <span className="text-gray-400 italic">{t("chantier.noEmail")}</span>
          )}
        </div>
      </div>

      {/* ─── Photos (always visible — foreman can upload) ──────── */}
      <ChantierPhotos chantierId={chantier.id} canEdit={isAdmin || isForeman} />

      {/* ─── Actions (admin only) ───────────────────────────────── */}
      {isAdmin && (
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3">{t("chantier.section.actions")}</h2>
        <ChantierActions chantier={chantier} onChange={setChantier} />
        {chantier.invoicePdfUrl && (
          <a
            href={chantier.invoicePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 text-sm text-accent hover:underline text-center"
          >
            {t("chantier.invoice.redownload")}
          </a>
        )}
      </div>
      )}

      {/* ─── Editable client info ────────────────────────────────── */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">{t("chantier.section.client")}</h2>

        <label className="text-sm block">
          <div className="font-semibold text-gray-700 mb-1">{t("chantier.field.fullName")}</div>
          <input
            type="text"
            value={chantier.clientName}
            onChange={(e) =>
              setChantier({ ...chantier, clientName: e.target.value })
            }
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v) patch("clientName", { clientName: v });
            }}
            disabled={readOnly || savingField === "clientName"}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="font-semibold text-gray-700 mb-1">{t("chantier.field.phone")}</div>
            <input
              type="tel"
              value={chantier.clientPhone}
              onChange={(e) =>
                setChantier({ ...chantier, clientPhone: e.target.value })
              }
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v) patch("clientPhone", { clientPhone: v });
              }}
              disabled={readOnly || savingField === "clientPhone"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
            />
          </label>

          <label className="text-sm">
            <div className="font-semibold text-gray-700 mb-1">
              {t("chantier.field.email")}
            </div>
            <input
              type="email"
              value={chantier.clientEmail ?? ""}
              placeholder="—"
              onChange={(e) =>
                setChantier({ ...chantier, clientEmail: e.target.value })
              }
              onBlur={(e) =>
                patch("clientEmail", {
                  clientEmail: e.target.value || null,
                })
              }
              disabled={readOnly || savingField === "clientEmail"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
            />
          </label>
        </div>

        <label className="text-sm block">
          <div className="font-semibold text-gray-700 mb-1">
            {t("chantier.field.address")}
          </div>
          <input
            type="text"
            value={chantier.addressLine1}
            onChange={(e) =>
              setChantier({ ...chantier, addressLine1: e.target.value })
            }
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v) patch("addressLine1", { addressLine1: v });
            }}
            disabled={readOnly || savingField === "addressLine1"}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
          />
        </label>

        <label className="text-sm block">
          <div className="font-semibold text-gray-700 mb-1">
            {t("chantier.field.cityPostal")}
          </div>
          <input
            type="text"
            value={chantier.addressLine2 ?? ""}
            placeholder="Montréal, QC H1B 5W5"
            onChange={(e) =>
              setChantier({ ...chantier, addressLine2: e.target.value })
            }
            onBlur={(e) =>
              patch("addressLine2", {
                addressLine2: e.target.value || null,
              })
            }
            disabled={readOnly || savingField === "addressLine2"}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      {/* ─── Project details (style + couleur + soumission + urgence) ─── */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">{t("chantier.section.project")}</h2>

        <div className={hideSubmission ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
          {!hideSubmission && (
          <label className="text-sm block">
            <div className="font-semibold text-gray-700 mb-1">
              {t("chantier.field.submission")}
            </div>
            <input
              type="url"
              value={chantier.submissionUrl ?? ""}
              placeholder="https://..."
              onChange={(e) =>
                setChantier({ ...chantier, submissionUrl: e.target.value })
              }
              onBlur={(e) =>
                patch("submissionUrl", {
                  submissionUrl: e.target.value || null,
                })
              }
              disabled={readOnly || savingField === "submissionUrl"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
            />
            {chantier.submissionUrl && (
              <a
                href={chantier.submissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1 text-xs text-accent hover:underline"
              >
                {t("chantier.openSubmission")}
              </a>
            )}
          </label>
          )}

          <label className="text-sm block">
            <div className="font-semibold text-gray-700 mb-1">{t("chantier.field.roofr")}</div>
            <input
              type="url"
              value={chantier.roofrUrl ?? ""}
              placeholder="https://app.roofr.com/..."
              onChange={(e) =>
                setChantier({ ...chantier, roofrUrl: e.target.value })
              }
              onBlur={(e) =>
                patch("roofrUrl", {
                  roofrUrl: e.target.value || null,
                })
              }
              disabled={readOnly || savingField === "roofrUrl"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
            />
            {chantier.roofrUrl && (
              <a
                href={chantier.roofrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1 text-xs text-accent hover:underline"
              >
                {t("chantier.openRoofr")}
              </a>
            )}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="font-semibold text-gray-700 mb-1">{t("chantier.field.style")}</div>
            <select
              value={chantier.style ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                patch("style", {
                  style: v ? (v as ChantierStyle) : null,
                });
              }}
              disabled={readOnly || savingField === "style"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none bg-white"
            >
              <option value="">{t("chantier.notChosen")}</option>
              {(Object.keys(STYLE_LABEL) as ChantierStyle[]).map((s) => (
                <option key={s} value={s}>
                  {STYLE_LABEL[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <div className="font-semibold text-gray-700 mb-1">{t("chantier.field.color")}</div>
            <select
              value={chantier.colorKey ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                patch("colorKey", { colorKey: v || null });
              }}
              disabled={readOnly || savingField === "colorKey"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none bg-white"
            >
              <option value="">{t("chantier.colorNotChosen")}</option>
              {COLOR_KEYS.map((key) => (
                <option key={key} value={key}>
                  {COLORS[key].frenchName} ({COLORS[key].ral})
                </option>
              ))}
            </select>
            {chantier.colorKey && COLORS[chantier.colorKey] && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                <span
                  className="inline-block w-3 h-3 rounded-full border border-gray-300"
                  style={{ backgroundColor: COLORS[chantier.colorKey].hex }}
                />
                {COLORS[chantier.colorKey].name}
              </div>
            )}
          </label>
        </div>

        <div>
          <div className="font-semibold text-gray-700 mb-1 text-sm">{t("chantier.field.urgency")}</div>
          <div className="flex items-center gap-2">
            {(["urgent", "non_urgent"] as ChantierUrgency[]).map((u) => {
              const active = chantier.urgency === u;
              return (
                <button
                  key={u}
                  onClick={() => patch("urgency", { urgency: u })}
                  disabled={readOnly || savingField === "urgency"}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    active
                      ? u === "urgent"
                        ? "bg-red-500 text-white"
                        : "bg-gray-700 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {u === "urgent" ? t("chantier.urgency.urgent") : t("chantier.urgency.normal")}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="font-semibold text-gray-700 mb-1 text-sm">
            {t("chantier.field.team")}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => patch("team", { team: null })}
              disabled={readOnly || savingField === "team"}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                !chantier.team
                  ? "bg-gray-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t("common.none")}
            </button>
            {CHANTIER_TEAMS.map((t) => {
              const active = chantier.team === t;
              const display = chiefNames[t] || t;
              return (
                <button
                  key={t}
                  onClick={() => patch("team", { team: t })}
                  disabled={readOnly || savingField === "team"}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border-2 ${
                    active
                      ? "border-accent bg-white text-gray-900"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {display}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Editable workflow fields ────────────────────────────── */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">{t("chantier.section.planning")}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="font-semibold text-gray-700 mb-1">
              {t("chantier.field.status")}
            </div>
            <select
              value={chantier.status}
              onChange={(e) =>
                patch("status", { status: e.target.value as ChantierStatus })
              }
              disabled={readOnly || savingField === "status"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none bg-white"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <div className="font-semibold text-gray-700 mb-1">
              {t("chantier.field.scheduledDate")}
            </div>
            <input
              type="date"
              value={chantier.scheduledDate || ""}
              onChange={(e) =>
                patch("scheduledDate", {
                  scheduledDate: e.target.value || null,
                })
              }
              disabled={readOnly || savingField === "scheduledDate"}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
            />
          </label>
        </div>

        {chantier.priority != null && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center justify-between gap-2">
            <span>
              📌 Pinné en priorité #{chantier.priority} (via drag dans le pipeline)
            </span>
            <button
              onClick={() => patch("priority", { priority: null })}
              className="text-xs underline hover:text-amber-900"
            >
              Détacher
            </button>
          </div>
        )}

        <label className="text-sm block">
          <div className="font-semibold text-gray-700 mb-1">
            {t("chantier.field.totalAmount")}
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            value={chantier.totalAmount ?? ""}
            placeholder="ex: 15000"
            onChange={(e) => {
              const v = e.target.value;
              patch("totalAmount", {
                totalAmount: v === "" ? null : Number(v),
              });
            }}
            disabled={readOnly || savingField === "totalAmount"}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
          />
        </label>

        <label className="text-sm block">
          <div className="font-semibold text-gray-700 mb-1">{t("chantier.field.notes")}</div>
          <textarea
            value={chantier.notes ?? ""}
            rows={3}
            onBlur={(e) => patch("notes", { notes: e.target.value || null })}
            onChange={(e) =>
              setChantier({ ...chantier, notes: e.target.value })
            }
            disabled={readOnly || savingField === "notes"}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none resize-y"
            placeholder={t("chantier.notes.placeholder")}
          />
        </label>
      </div>

      {/* ─── Timeline ────────────────────────────────────────────── */}
      <ChantierTimeline chantier={chantier} />

      {/* ─── Danger zone (admin only) ───────────────────────────── */}
      {isAdmin && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-700 hover:underline"
          >
            {t("chantier.delete")}
          </button>
        </div>
      )}
    </div>
  );
}
