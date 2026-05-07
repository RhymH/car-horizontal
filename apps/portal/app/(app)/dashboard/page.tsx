import { CalendarPlus, Eye, UserPlus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { DashboardShowcase } from "@/components/dashboard/DashboardShowcase";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre garage."
        actions={
          <>
            <Button variant="outline" size="sm">
              <CalendarPlus />
              Nouveau RDV
            </Button>
            <Button size="sm">
              <UserPlus />
              Nouveau client
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Rappels du jour" description="Ce qui part aujourd'hui">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-semibold">12</span>
            <StatusBadge tone="info">SMS / Email</StatusBadge>
          </div>
        </SectionCard>
        <SectionCard
          title="RDV cette semaine"
          description="Planifiés sur les 7 prochains jours"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl font-semibold">8</span>
            <StatusBadge tone="success">À jour</StatusBadge>
          </div>
        </SectionCard>
        <SectionCard
          title="Véhicules en alerte"
          description="Entretien dépassé"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl font-semibold">3</span>
            <StatusBadge tone="warning">À traiter</StatusBadge>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Activité récente"
        description="Les dernières interventions enregistrées"
        actions={
          <Button variant="outline" size="sm">
            Voir tout
          </Button>
        }
      >
        <DashboardShowcase />
      </SectionCard>

      <EmptyState
        icon={Wrench}
        title="Aucun rapport généré"
        description="Les rapports mensuels apparaîtront ici une fois la première intervention enregistrée."
        action={
          <Button variant="outline" size="sm">
            <Eye />
            Voir un exemple
          </Button>
        }
      />
    </div>
  );
}
