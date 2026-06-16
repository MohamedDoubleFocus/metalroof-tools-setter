import type { Metadata } from "next";
import NavHeader from "@/components/shared/NavHeader";
import UserTopBar from "@/components/shared/UserTopBar";
import { I18nProvider } from "@/lib/i18n/context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metal Roof Montreal | Outils",
  description:
    "Outils internes Metal Roof Montreal — simulateur de toiture IA et gestion de rendez-vous.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="bg-gray-50 min-h-screen" suppressHydrationWarning>
        <I18nProvider>
          <NavHeader />
          <UserTopBar />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
