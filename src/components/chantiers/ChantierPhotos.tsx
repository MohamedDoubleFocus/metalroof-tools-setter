"use client";

import { useEffect, useRef, useState } from "react";
import { useMyProfile } from "@/lib/auth/use-me";

interface Photo {
  id: string;
  chantier_id: string;
  url: string;
  caption: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

interface Props {
  chantierId: string;
  canEdit: boolean;
}

function formatTs(ts: string): string {
  return new Date(ts).toLocaleString("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChantierPhotos({ chantierId, canEdit }: Props) {
  const profile = useMyProfile();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/chantiers/${chantierId}/photos`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotos(data.photos as Photo[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantierId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/chantiers/${chantierId}/photos`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur upload");
        return;
      }
      setPhotos((prev) => [data.photo as Photo, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!window.confirm("Supprimer cette photo ?")) return;
    const res = await fetch(
      `/api/chantiers/${chantierId}/photos/${photo.id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      if (lightbox?.id === photo.id) setLightbox(null);
    } else {
      const data = await res.json();
      alert(data.error || "Erreur");
    }
  };

  const canDeletePhoto = (photo: Photo): boolean => {
    if (!profile) return false;
    if (profile.role === "admin") return true;
    if (profile.role === "foreman" && photo.uploaded_by === profile.id)
      return true;
    return false;
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-bold text-gray-700">
          📷 Photos ({photos.length})
        </h2>
        {canEdit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
              id={`photos-upload-${chantierId}`}
            />
            <label
              htmlFor={`photos-upload-${chantierId}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
                uploading
                  ? "bg-gray-300 text-gray-600 cursor-wait"
                  : "bg-accent text-white hover:bg-accent-light"
              }`}
            >
              {uploading ? "Upload..." : "📷 Ajouter"}
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          Chargement...
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          {canEdit
            ? "Aucune photo pour l'instant — clique sur 📷 Ajouter."
            : "Aucune photo."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setLightbox(p)}
              className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 group focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 text-white text-[10px]">
                {formatTs(p.uploaded_at)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt=""
            className="max-w-full max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-3 text-white text-sm flex items-center gap-3">
            <span>{formatTs(lightbox.uploaded_at)}</span>
            {canDeletePhoto(lightbox) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(lightbox);
                }}
                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
              >
                Supprimer
              </button>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="px-2 py-1 bg-white/20 text-white rounded text-xs hover:bg-white/30"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
