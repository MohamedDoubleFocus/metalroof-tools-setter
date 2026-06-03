import type { Chantier } from "@/types/chantiers";

interface Event {
  label: string;
  ts: number;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChantierTimeline({
  chantier,
}: {
  chantier: Chantier;
}) {
  const events: Event[] = [];
  events.push({ label: "Chantier créé", ts: chantier.createdAt });
  if (chantier.signedAt !== chantier.createdAt) {
    events.push({ label: "Contrat signé", ts: chantier.signedAt });
  }
  if (chantier.smsJ7SentAt) {
    events.push({ label: "SMS J-7 envoyé", ts: chantier.smsJ7SentAt });
  }
  if (chantier.smsJ2SentAt) {
    events.push({ label: "SMS J-2 envoyé", ts: chantier.smsJ2SentAt });
  }
  if (chantier.startedAt) {
    events.push({ label: "Installation démarrée", ts: chantier.startedAt });
  }
  if (chantier.completedAt) {
    events.push({ label: "Installation terminée", ts: chantier.completedAt });
  }
  if (chantier.warrantySentAt) {
    events.push({ label: "Garantie envoyée", ts: chantier.warrantySentAt });
  }
  if (chantier.invoiceSentAt) {
    events.push({ label: "Facture envoyée", ts: chantier.invoiceSentAt });
  }

  events.sort((a, b) => a.ts - b.ts);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Historique</h3>
      <ol className="space-y-2">
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="shrink-0 w-2 h-2 mt-2 bg-accent rounded-full" />
            <div>
              <div className="font-semibold text-gray-800">{e.label}</div>
              <div className="text-xs text-gray-500">{formatTs(e.ts)}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
