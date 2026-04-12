import SlotFinder from "@/components/booking/SlotFinder";

export default function SlotsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Trouver un creneau
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Entrez l&apos;adresse du nouveau client — on analyse vos 15 prochains
        jours pour trouver les creneaux qui minimisent votre temps de deplacement.
      </p>
      <SlotFinder />
    </div>
  );
}
