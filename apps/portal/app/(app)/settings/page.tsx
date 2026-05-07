import { Settings } from "lucide-react";
import { PageStub } from "@/components/layout/PageStub";

export default function SettingsPage() {
  return (
    <PageStub
      icon={Settings}
      title="Paramètres"
      description="Garage, équipe, modèles de message, intégrations."
    />
  );
}
