"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Car,
  Gauge,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  engineTypeLabels,
  type EngineTypeApi,
  type VehicleDetail,
} from "@/lib/api/vehicles";

const ENGINE_TONE: Record<EngineTypeApi, "success" | "neutral" | "info" | "warning"> = {
  Gasoline: "neutral",
  Diesel: "neutral",
  Hybrid: "info",
  Electric: "success",
  LPG: "warning",
};

export interface VehicleHeaderProps {
  vehicle: VehicleDetail;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateMileage: () => void;
  onAddMaintenance: () => void;
}

export function VehicleHeader({
  vehicle,
  onEdit,
  onDelete,
  onUpdateMileage,
  onAddMaintenance,
}: VehicleHeaderProps) {
  const initials = `${vehicle.make.charAt(0)}${vehicle.model.charAt(0)}`.toUpperCase();
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5">
      <div>
        <Link
          href="/vehicles"
          className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Tous les véhicules
        </Link>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-muted text-lg font-semibold text-muted-foreground">
            {initials}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {vehicle.make} {vehicle.model}
              </h1>
              {vehicle.engineType && (
                <StatusBadge tone={ENGINE_TONE[vehicle.engineType]}>
                  {engineTypeLabels[vehicle.engineType]}
                </StatusBadge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {vehicle.licensePlate ? (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono uppercase">
                  {vehicle.licensePlate}
                </span>
              ) : (
                <span className="italic text-muted-foreground/70">
                  Sans immatriculation
                </span>
              )}
              {vehicle.year !== null && <span>{vehicle.year}</span>}
              <span className="inline-flex items-center gap-1">
                <Car className="size-3.5" />
                <Link
                  href={`/clients/${vehicle.customerId}`}
                  className="hover:text-foreground hover:underline"
                >
                  {vehicle.customerFullName || "Client inconnu"}
                </Link>
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onUpdateMileage}>
            <Gauge />
            Kilométrage
          </Button>
          <Button variant="outline" size="sm" onClick={onAddMaintenance}>
            <Plus />
            Entretien
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil />
            Modifier
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 />
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
