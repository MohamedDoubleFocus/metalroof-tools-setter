import Link from "next/link";
import ChantierForm from "@/components/chantiers/ChantierForm";

export default function NewChantierPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link
          href="/chantiers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Retour à la liste
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Nouveau chantier</h1>
      <p className="text-sm text-gray-500">
        Renseigne les infos client + date de signature. La date d&apos;install
        peut être ajoutée plus tard.
      </p>
      <ChantierForm />
    </div>
  );
}
