"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onUploaded: (file: File, preview: string, remoteUrl: string) => void;
  disablePaste?: boolean;
  label?: string;
  compact?: boolean;
}

export default function ImageUploader({
  onUploaded,
  disablePaste = false,
  label,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
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

  // Listen for clipboard paste events globally
  useEffect(() => {
    if (disablePaste) return;
    const handlePaste = (e: ClipboardEvent) => {
      // Skip if user is pasting into an input/textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            // Rename to a friendly filename (paste events give files like "image.png")
            const renamed = new File(
              [file],
              `pasted-${Date.now()}.${file.type.split("/")[1] || "png"}`,
              { type: file.type }
            );
            setPasteFlash(true);
            setTimeout(() => setPasteFlash(false), 600);
            handleFile(renamed);
            return;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFile, disablePaste]);

  return (
    <div className={compact ? "" : "max-w-2xl mx-auto"}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl text-center cursor-pointer
          transition-all duration-200
          ${compact ? "p-6" : "p-12"}
          ${
            dragging || pasteFlash
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
            <div className={compact ? "text-3xl mb-2" : "text-5xl mb-4"}>🏠</div>
            <p className={`font-semibold text-gray-700 ${compact ? "text-base" : "text-lg"}`}>
              {label || "Déposez votre photo ici"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ou cliquez pour parcourir vos fichiers
            </p>
            {!disablePaste && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-xs text-gray-400">ou collez avec</span>
                <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-[11px] font-mono text-gray-600">
                  Ctrl
                </kbd>
                <span className="text-xs text-gray-400">+</span>
                <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-[11px] font-mono text-gray-600">
                  V
                </kbd>
              </div>
            )}
            {!compact && (
              <p className="text-xs text-gray-400 mt-3">
                Formats acceptés : JPG, PNG, WebP — Max 10 Mo
              </p>
            )}
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
