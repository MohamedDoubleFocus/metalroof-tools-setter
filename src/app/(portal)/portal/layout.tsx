import type { Metadata } from "next";

/**
 * White-label layout for the freelancer portal.
 *
 * IMPORTANT: NO mention of Metal Roof Montréal, Bricole, or any business
 * brand. This is what the freelancer sees — keep it generic.
 */
export const metadata: Metadata = {
  title: "Report Portal",
  description: "Roofing report orders",
  robots: { index: false, follow: false },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Report Portal</div>
          <div className="text-xs text-slate-400 hidden sm:block">
            Roofing reports
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Report Portal
        </div>
      </footer>
    </div>
  );
}
