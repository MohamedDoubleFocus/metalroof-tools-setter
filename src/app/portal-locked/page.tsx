import type { Metadata } from "next";
import { Suspense } from "react";
import PortalLockedForm from "./PortalLockedForm";

export const metadata: Metadata = {
  title: "Report Portal — Sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function PortalLockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-slate-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 11c0-1.657 1.343-3 3-3s3 1.343 3 3v2m-6 0h6m-6 0v6a2 2 0 002 2h2a2 2 0 002-2v-6M9 11V7a4 4 0 118 0v4m-9 0h10"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Report Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter your access code to continue.
          </p>
        </div>

        <Suspense fallback={null}>
          <PortalLockedForm />
        </Suspense>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} Report Portal
        </p>
      </div>
    </div>
  );
}
