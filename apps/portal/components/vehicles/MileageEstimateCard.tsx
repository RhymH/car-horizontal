"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  vehiclesApi,
  type MileageConfidenceApi,
  type VehicleDetail,
} from "@/lib/api/vehicles";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("fr-FR");
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const confidenceLabel: Record<MileageConfidenceApi, string> = {
  High: "confiance élevée",
  Medium: "confiance moyenne",
  Low: "confiance faible",
};

const confidenceClass: Record<MileageConfidenceApi, string> = {
  High: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  Low: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
};

function relativeMonths(from: Date, to: Date): string {
  const ms = to.getTime() - from.getTime();
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  if (days < 30) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 24) return `il y a ${months} mois`;
  const years = Math.floor(months / 12);
  return `il y a ${years} an${years > 1 ? "s" : ""}`;
}

export interface MileageEstimateCardProps {
  vehicle: VehicleDetail;
  onUpdateMileage: () => void;
}

export function MileageEstimateCard({
  vehicle,
  onUpdateMileage,
}: MileageEstimateCardProps) {
  const queryClient = useQueryClient();

  const estimateQuery = useQuery({
    queryKey: queryKeys.vehicles.mileageEstimate(vehicle.id),
    queryFn: ({ signal }) => vehiclesApi.getMileageEstimate(vehicle.id, signal),
  });

  const requestMutation = useMutation({
    mutationFn: () => vehiclesApi.requestMileageCheck(vehicle.id),
    onSuccess: () => {
      toast.success("Demande envoyée au client");
    },
    onError: (e) => {
      toast.error(
        extractApiErrorMessage(e, "Impossible d'envoyer la demande."),
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.reminders.all() }),
  });

  if (estimateQuery.isLoading) {
    return (
      <SectionCard title="Kilométrage estimé">
        <div className="h-16 animate-pulse rounded bg-muted" />
      </SectionCard>
    );
  }

  if (estimateQuery.isError || !estimateQuery.data) {
    return null;
  }

  const estimate = estimateQuery.data;
  const dailyRateRounded = Math.round(estimate.dailyRate);
  const lastObservedAt = estimate.lastObservedAt
    ? new Date(estimate.lastObservedAt)
    : null;
  const lastObservedRelative = lastObservedAt
    ? relativeMonths(lastObservedAt, new Date())
    : null;

  return (
    <SectionCard title="Kilométrage estimé">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">
            ~{numberFormatter.format(estimate.estimatedKm)} km
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              confidenceClass[estimate.confidence],
            )}
          >
            {confidenceLabel[estimate.confidence]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {estimate.lastObservedKm !== null && lastObservedAt ? (
            <>
              Vu à{" "}
              <span className="font-medium tabular-nums text-foreground">
                {numberFormatter.format(estimate.lastObservedKm)} km
              </span>{" "}
              {lastObservedRelative} (
              {dateFormatter.format(lastObservedAt)}) — ~{dailyRateRounded}{" "}
              km/jour.
            </>
          ) : (
            <>Aucun relevé enregistré — projection prudente sur prior moteur.</>
          )}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onUpdateMileage}
          >
            <Pencil className="mr-1.5 size-3.5" />
            Mettre à jour
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={requestMutation.isPending}
            onClick={() => requestMutation.mutate()}
          >
            <Send className="mr-1.5 size-3.5" />
            Demander au client
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
