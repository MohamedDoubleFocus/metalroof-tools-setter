"use client";

export type ProspectionTab = "add" | "today" | "map" | "sectors";

interface Props {
  tab: ProspectionTab;
  onChange: (tab: ProspectionTab) => void;
}

interface NavItem {
  key: ProspectionTab;
  label: string;
  /** SVG icon, 24x24 */
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "add",
    label: "Ajouter",
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    key: "today",
    label: "Aujourd'hui",
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
  {
    key: "map",
    label: "Carte",
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    key: "sectors",
    label: "Secteurs",
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25v13.5" />
      </svg>
    ),
  },
];

/**
 * Mobile-style fixed bottom navigation. 4 big tap targets, always visible.
 */
export default function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] z-30">
      <div className="max-w-2xl mx-auto grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                active ? "text-accent" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <div className="w-6 h-6">{item.icon}</div>
              <span
                className={`text-[11px] ${active ? "font-bold" : "font-medium"}`}
              >
                {item.label}
              </span>
              {active && (
                <div className="absolute -top-px w-12 h-1 bg-accent rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
