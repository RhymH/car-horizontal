import { Bell } from "lucide-react";
import { PageStub } from "@/components/layout/PageStub";

export default function RemindersPage() {
  return (
    <PageStub
      icon={Bell}
      title="Rappels"
      description="Rappels SMS et email automatiques liés aux véhicules de vos clients."
    />
  );
}
