import Link from "next/link";
import CreateReportForm from "@/components/reports/CreateReportForm";

export default function NewReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reports"
          className="text-sm text-gray-500 hover:text-accent"
        >
          ← Toutes les commandes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Nouvelle commande de rapport
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Le freelancer reçoit uniquement l&apos;adresse, les instructions et
          les photos. Aucune info client (nom, téléphone) n&apos;est partagée.
        </p>
      </div>
      <CreateReportForm />
    </div>
  );
}
