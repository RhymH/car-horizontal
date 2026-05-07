"use client";

import Link from "next/link";
import { Car, Gauge } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CustomerVehicle } from "@/lib/api/customers";

export interface CustomerVehiclesSectionProps {
  vehicles: CustomerVehicle[];
  onAddVehicle: () => void;
}

export function CustomerVehiclesSection({
  vehicles,
  onAddVehicle,
}: CustomerVehiclesSectionProps) {
  return (
    <SectionCard
      title="Véhicules"
      description={
        vehicles.length === 0
          ? "Aucun véhicule rattaché"
          : `${vehicles.length} véhicule(s)`
      }
      actions={
        <Button variant="outline" size="sm" onClick={onAddVehicle}>
          <Car />
          Ajouter
        </Button>
      }
    >
      {vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Aucun véhicule"
          description="Rattachez un véhicule pour suivre son entretien."
          action={
            <Button size="sm" onClick={onAddVehicle}>
              Ajouter le premier véhicule
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((v) => (
            <Link
              key={v.id}
              href={`/vehicles/${v.id}`}
              className="group flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Car className="size-4 text-muted-foreground group-hover:text-primary" />
                {v.make} {v.model}{" "}
                <span className="text-muted-foreground">({v.year})</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono uppercase">
                  {v.licensePlate || "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Gauge className="size-3" />
                  {v.currentMileage.toLocaleString("fr-FR")} km
                </span>
                <span>{v.engineType}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
