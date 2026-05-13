import WarrantyForm from "@/components/sav/WarrantyForm";

export default function WarrantyPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Certificat de garantie
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Remplissez les informations du client. Un courriel avec le PDF du
        certificat sera envoyé à l&apos;adresse fournie.
      </p>
      <WarrantyForm />
    </div>
  );
}
