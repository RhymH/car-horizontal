import { Activity } from "lucide-react";
import { PageStub } from "@/components/layout/PageStub";

export default function TimelinePage() {
  return (
    <PageStub
      icon={Activity}
      title="Timeline"
      description="Vue chronologique des entretiens, rappels et événements."
    />
  );
}
