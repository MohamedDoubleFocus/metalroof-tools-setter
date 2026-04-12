"use client";

import { SessionProvider } from "next-auth/react";
import AuthGate from "@/components/booking/AuthGate";
import Link from "next/link";
import { usePathname } from "next/navigation";

const BOOKING_NAV = [
  { href: "/booking", label: "Dashboard" },
  { href: "/booking/slots", label: "Trouver un creneau" },
  { href: "/booking/map", label: "Carte" },
  { href: "/booking/stats", label: "Statistiques" },
  { href: "/booking/settings", label: "Parametres" },
];

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SessionProvider>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2">
          {BOOKING_NAV.map((item) => {
            const isActive =
              item.href === "/booking"
                ? pathname === "/booking"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm whitespace-nowrap px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-accent text-white font-semibold"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <AuthGate>{children}</AuthGate>
      </div>
    </SessionProvider>
  );
}
