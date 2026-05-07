"use client";

import { SectionCard } from "@/components/ui/SectionCard";
import {
  engineTypeLabels,
  type VehicleDetail,
} from "@/lib/api/vehicles";
import { transmissionLabels, type Transmission } from "@/lib/schemas/vehicle";
import Link from "next/link";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("fr-FR");

function daysBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function transmissionLabel(value: string | null): string | null {
  if (!value) return null;
  if (value in transmissionLabels) {
    return transmissionLabels[value as Transmission];
  }
  return value;
}

export function VehicleSummaryCard({ vehicle }: { vehicle: VehicleDetail }) {
  const mileageDays = daysBetween(new Date(vehicle.mileageUpdatedAt), new Date());
  return (
    <SectionCard title="Résumé">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Row label="Client">
          <Link
            href={`/clients/${vehicle.customerId}`}
            className="hover:text-foreground hover:underline"
          >
            {vehicle.customerFullName || "Inconnu"}
          </Link>
        </Row>
        <Row label="Année">{vehicle.year ?? "—"}</Row>
        <Row label="VIN">
          <span className="font-mono text-xs">{vehicle.vin || "—"}</span>
        </Row>
        <Row label="Couleur">{vehicle.color || "—"}</Row>
        <Row label="Type de moteur">
          {vehicle.engineType ? engineTypeLabels[vehicle.engineType] : "—"}
        </Row>
        <Row label="Boîte de vitesses">
          {transmissionLabel(vehicle.transmissionType) || "—"}
        </Row>
        <Row label="Acheté le">
          {vehicle.purchasedAt
            ? dateFormatter.format(new Date(vehicle.purchasedAt))
            : "—"}
        </Row>
        <Row label="Kilométrage">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-medium tabular-nums">
              {numberFormatter.format(vehicle.currentMileage)} km
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {mileageDays === 0
                ? "MAJ aujourd'hui"
                : mileageDays === 1
                  ? "MAJ il y a 1 jour"
                  : `MAJ il y a ${mileageDays} jours`}
            </span>
          </div>
        </Row>
      </dl>
    </SectionCard>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
