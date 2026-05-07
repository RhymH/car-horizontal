import { ClipboardList } from "lucide-react";
import { PageStub } from "@/components/layout/PageStub";

export default function HistoryPage() {
  return (
    <PageStub
      icon={ClipboardList}
      title="Historique"
      description="Toutes les interventions passées, classées par véhicule et par date."
    />
  );
}
