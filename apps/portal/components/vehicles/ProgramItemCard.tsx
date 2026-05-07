"use client";

import {
  AlertTriangle,
  Check,
  CircleAlert,
  CircleDashed,
  Clock,
  Info,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { maintenanceItemLabel } from "@/lib/api/maintenanceItemCodes";
import type { VehicleProgramItemProjection } from "@/lib/api/vehicles";
import { cn } from "@/lib/utils";

export interface ProgramItemCardProps {
  item: VehicleProgramItemProjection;
  onMarkDone?: (item: VehicleProgramItemProjection) => void;
  onSendReminder?: (item: VehicleProgramItemProjection) => void;
  onCustomize?: (item: VehicleProgramItemProjection) => void;
  reminderDisabled?: boolean;
}

const severityIcons = {
  Critical: AlertTriangle,
  Recommended: CircleAlert,
  Optional: Info,
};

const severityClasses = {
  Critical: "text-red-600",
  Recommended: "text-amber-600",
  Optional: "text-emerald-600",
};

const severityLabels = {
  Critical: "Critique",
  Recommended: "Recommandé",
  Optional: "Optionnel",
};

const statusVariant: Record<
  VehicleProgramItemProjection["status"],
  { label: string; tone: string }
> = {
  Done: { label: "Fait récemment", tone: "bg-emerald-50 text-emerald-700" },
  UpcomingSoon: { label: "À faire bientôt", tone: "bg-amber-50 text-amber-700" },
  Upcoming: { label: "À prévoir", tone: "bg-blue-50 text-blue-700" },
  Overdue: { label: "En retard", tone: "bg-red-50 text-red-700" },
  Future: { label: "À venir", tone: "bg-muted text-muted-foreground" },
  Disabled: { label: "Désactivé", tone: "bg-muted/50 text-muted-foreground" },
};

function describeLastDone(item: VehicleProgramItemProjection): string {
  if (!item.lastDoneAt) return "Jamais effectué dans l'historique enregistré.";
  const date = new Date(item.lastDoneAt);
  const months = Math.max(
    0,
    Math.round(
      (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30),
    ),
  );
  const km = item.lastDoneKm
    ? ` @ ${item.lastDoneKm.toLocaleString("fr-FR")} km`
    : "";
  return `Fait il y a ${months} mois${km}`;
}

function describeNext(item: VehicleProgramItemProjection): string | null {
  const parts: string[] = [];
  if (item.kmRemaining != null && item.nextDueKm != null) {
    if (item.kmRemaining < 0) {
      parts.push(`En retard : prévu à ${item.nextDueKm.toLocaleString("fr-FR")} km`);
    } else {
      parts.push(
        `Prévu à ${item.nextDueKm.toLocaleString("fr-FR")} km — dans ${item.kmRemaining.toLocaleString("fr-FR")} km`,
      );
    }
  }
  if (item.daysRemaining != null) {
    if (item.daysRemaining < 0) {
      parts.push(`Échéance dépassée de ${Math.abs(item.daysRemaining)} jours`);
    } else {
      parts.push(`dans ${item.daysRemaining} jours`);
    }
  }
  return parts.length === 0 ? null : parts.join(" · ");
}

export function ProgramItemCard({
  item,
  onMarkDone,
  onSendReminder,
  onCustomize,
  reminderDisabled,
}: ProgramItemCardProps) {
  const SeverityIcon = severityIcons[item.severity];
  const status = statusVariant[item.status];
  const next = describeNext(item);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-card p-3",
        item.disabled && "opacity-60",
      )}
    >
      <div className="flex items-start gap-2">
        <SeverityIcon
          className={cn("mt-0.5 size-4 shrink-0", severityClasses[item.severity])}
          aria-label={severityLabels[item.severity]}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {maintenanceItemLabel(item.code)}
            </span>
            <Badge variant="outline" className={cn("border-0 px-1.5", status.tone)}>
              {status.label}
            </Badge>
            {item.hasOverride && (
              <Badge variant="outline" className="border-0 bg-purple-50 px-1.5 text-purple-700">
                Personnalisé
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {describeLastDone(item)}
          </span>
          {next && (
            <span className="text-xs">
              <Clock className="mr-1 inline-block size-3 align-text-bottom" />
              {next}
            </span>
          )}
          {(item.estimatedCostMin != null || item.estimatedCostMax != null) && (
            <span className="text-xs text-muted-foreground">
              Coût indicatif :{" "}
              {item.estimatedCostMin != null && item.estimatedCostMax != null
                ? `${item.estimatedCostMin}–${item.estimatedCostMax} €`
                : `${item.estimatedCostMin ?? item.estimatedCostMax} €`}
            </span>
          )}
        </div>
      </div>
      {!item.disabled && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onMarkDone && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => onMarkDone(item)}
            >
              <Check className="size-3.5" />
              Marquer comme fait
            </Button>
          )}
          {onSendReminder && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => onSendReminder(item)}
              disabled={reminderDisabled}
              title={reminderDisabled ? "Disponible quand les rappels seront activés" : undefined}
            >
              <Sparkles className="size-3.5" />
              Envoyer un rappel
            </Button>
          )}
          {onCustomize && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => onCustomize(item)}
            >
              <CircleDashed className="size-3.5" />
              Personnaliser
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
