"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  Tabs,
  TabsBadge,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ProgramItemCard } from "@/components/vehicles/ProgramItemCard";
import {
  vehiclesApi,
  type VehicleProgramItemProjection,
  type VehicleDetail,
} from "@/lib/api/vehicles";
import { queryKeys } from "@/lib/query/keys";

export interface MaintenanceProgramSectionProps {
  vehicle: VehicleDetail;
  onMarkDone?: (item: VehicleProgramItemProjection) => void;
  onSendReminder?: (item: VehicleProgramItemProjection) => void;
  onCustomize?: (item: VehicleProgramItemProjection) => void;
}

export function MaintenanceProgramSection({
  vehicle,
  onMarkDone,
  onSendReminder,
  onCustomize,
}: MaintenanceProgramSectionProps) {
  const [tab, setTab] = useState("upcoming");

  const projection = useQuery({
    queryKey: queryKeys.vehicles.programProjection(vehicle.id),
    queryFn: ({ signal }) => vehiclesApi.getProgramProjection(vehicle.id, signal),
    enabled: !!vehicle.vehicleModelId,
  });

  if (!vehicle.vehicleModelId) {
    return (
      <SectionCard title="Programme d'entretien constructeur">
        <div className="flex items-start gap-3 rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Aucun modèle catalogue attaché.</p>
            <p className="text-muted-foreground">
              Modifiez ce véhicule et sélectionnez votre modèle dans le catalogue
              constructeur pour bénéficier des entretiens préconisés (vidange,
              courroie, freins, etc.) avec leurs intervalles précis.
            </p>
          </div>
        </div>
      </SectionCard>
    );
  }

  if (projection.isLoading) {
    return (
      <SectionCard title="Programme d'entretien constructeur">
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Calcul de votre programme…
        </div>
      </SectionCard>
    );
  }

  if (projection.isError || !projection.data) {
    return (
      <SectionCard title="Programme d'entretien constructeur">
        <p className="text-sm text-destructive">
          Impossible de charger le programme. Réessayez dans quelques instants.
        </p>
      </SectionCard>
    );
  }

  const data = projection.data;
  const items = data.items;

  const upcoming = items.filter((i) =>
    ["UpcomingSoon", "Upcoming", "Overdue"].includes(i.status),
  );
  const future = items.filter((i) => i.status === "Future");
  const done = items.filter((i) => i.status === "Done");

  const empty = items.length === 0;

  return (
    <SectionCard
      title="Programme d'entretien constructeur"
      description={
        data.vehicleModelDisplayName
          ? `${data.vehicleModelDisplayName}${data.programName ? ` — ${data.programName}` : ""}`
          : undefined
      }
    >
      {empty ? (
        <p className="py-4 text-sm text-muted-foreground">
          Le programme constructeur est vide pour ce véhicule.
        </p>
      ) : (
        <>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="upcoming">
                À faire bientôt
                <TabsBadge>{upcoming.length}</TabsBadge>
              </TabsTrigger>
              <TabsTrigger value="all">
                Tout le programme
                <TabsBadge>{items.length}</TabsBadge>
              </TabsTrigger>
              <TabsTrigger value="history">
                Historique
                <TabsBadge>{done.length}</TabsBadge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="space-y-2">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun entretien urgent — tout est à jour.
                </p>
              ) : (
                upcoming.map((item) => (
                  <ProgramItemCard
                    key={item.code}
                    item={item}
                    onMarkDone={onMarkDone}
                    onSendReminder={onSendReminder}
                    onCustomize={onCustomize}
                  />
                ))
              )}
            </TabsContent>
            <TabsContent value="all" className="space-y-2">
              {[...upcoming, ...future, ...done].map((item) => (
                <ProgramItemCard
                  key={item.code}
                  item={item}
                  onMarkDone={onMarkDone}
                  onSendReminder={onSendReminder}
                  onCustomize={onCustomize}
                />
              ))}
            </TabsContent>
            <TabsContent value="history" className="space-y-2">
              {done.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun item récemment effectué dans le programme.
                </p>
              ) : (
                done.map((item) => (
                  <ProgramItemCard
                    key={item.code}
                    item={item}
                    onCustomize={onCustomize}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
          <p className="pt-3 text-xs text-muted-foreground">
            Ces préconisations sont basées sur le programme constructeur. Vous
            pouvez les ajuster pour ce véhicule en cliquant sur « Personnaliser ».
          </p>
        </>
      )}
    </SectionCard>
  );
}
