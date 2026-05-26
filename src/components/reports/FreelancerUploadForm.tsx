"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

interface Props {
  orderId: string;
  /** Called once upload succeeds — parent can refresh / show success state. */
  onUploaded?: () => void;
}

export default function FreelancerUploadForm({ orderId, onUploaded }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      // Direct browser-to-Blob upload — bypasses Vercel's 4.5 MB function
      // body limit. The server only signs the upload token and reacts to
      // completion via the onUploadCompleted callback in
      // /api/reports/upload-pdf.
      await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/reports/upload-pdf",
        clientPayload: JSON.stringify({ orderId }),
      });
      setSuccess(true);
      onUploaded?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [file, uploading, orderId, onUploaded, router]);

  if (success) {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm">
        ✅ Report uploaded successfully. The client has been notified.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Upload completed PDF
        </span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-2 w-full text-sm file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-slate-200 file:text-slate-800 file:font-semibold file:cursor-pointer hover:file:bg-slate-300"
        />
        {file && (
          <p className="text-xs text-slate-500 mt-2">
            {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </label>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!file || uploading}
        className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        {uploading ? "Uploading…" : "Submit report"}
      </button>
    </div>
  );
}
