"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  onUploaded: (file: File, preview: string, remoteUrl: string) => void;
}

export default function ImageUploader({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Veuillez sélectionner une image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 10 Mo.");
        return;
      }

      setError(null);
      setUploading(true);

      const preview = URL.createObjectURL(file);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur de téléchargement");
        }

        const data = await res.json();
        onUploaded(file, preview, data.imageUrl);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du téléchargement de l'image"
        );
        URL.revokeObjectURL(preview);
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${
            dragging
              ? "border-accent bg-red-50 scale-[1.02]"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 font-medium">
              Téléchargement en cours...
            </p>
          </div>
        ) : (
          <>
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-lg font-semibold text-gray-700">
              Déposez votre photo ici
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ou cliquez pour parcourir vos fichiers
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Formats acceptés : JPG, PNG, WebP — Max 10 Mo
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
