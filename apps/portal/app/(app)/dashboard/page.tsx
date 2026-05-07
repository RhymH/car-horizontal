import { LayoutDashboard } from "lucide-react";
import { PageStub } from "@/components/layout/PageStub";

export default function DashboardPage() {
  return (
    <PageStub
      icon={LayoutDashboard}
      title="Tableau de bord"
      description="Vue d'ensemble de votre activité : rappels du jour, rendez-vous, KPI clients et véhicules."
    />
  );
}
