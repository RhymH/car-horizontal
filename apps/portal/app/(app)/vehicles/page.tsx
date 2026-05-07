import { Car } from "lucide-react";
import { PageStub } from "@/components/layout/PageStub";

export default function VehiclesPage() {
  return (
    <PageStub
      icon={Car}
      title="Véhicules"
      description="Fiches véhicules avec immatriculation, modèle, kilométrage."
    />
  );
}
