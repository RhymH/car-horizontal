import { CalendarDays } from "lucide-react";
import { PageStub } from "@/components/layout/PageStub";

export default function AppointmentsPage() {
  return (
    <PageStub
      icon={CalendarDays}
      title="Rendez-vous"
      description="Planifiez les passages au garage, suivez le statut."
    />
  );
}
