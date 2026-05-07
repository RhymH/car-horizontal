"use client";

import {
  AlertTriangle,
  Bell,
  Car,
  CheckCircle2,
  Clock,
  Pencil,
  Repeat,
  ShieldCheck,
  Snowflake,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/RowActions";
import { cn } from "@/lib/utils";
import {
  timelineEventKindLabels,
  timelineEventStatusLabels,
  type TimelineEvent,
  type TimelineEventKindApi,
} from "@/lib/api/timeline";
import type { TimelineEventStatusApi } from "@/lib/api/vehicles";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("fr-FR");

const KIND_ICON: Record<TimelineEventKindApi, typeof Wrench> = {
  Maintenance: Wrench,
  TechnicalInspection: ShieldCheck,
  TireSwap: Snowflake,
  TradeInOpportunity: Repeat,
  WarrantyExpiry: AlertTriangle,
  Custom: Clock,
};

const KIND_TONE: Record<TimelineEventKindApi, string> = {
  Maintenance: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  TechnicalInspection: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  TireSwap: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  TradeInOpportunity: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
  WarrantyExpiry: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  Custom: "bg-muted text-muted-foreground",
};

const STATUS_TONE: Record<
  TimelineEventStatusApi,
  "success" | "neutral" | "info" | "warning" | "danger"
> = {
  Pending: "info",
  Triggered: "warning",
  Done: "success",
  Skipped: "neutral",
};

export interface TimelineEventCardProps {
  event: TimelineEvent;
  onComplete: (event: TimelineEvent) => void;
  onSnooze: (event: TimelineEvent) => void;
  onSendReminder: (event: TimelineEvent) => void;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (event: TimelineEvent) => void;
  onSkip: (event: TimelineEvent) => void;
}

export function TimelineEventCard({
  event,
  onComplete,
  onSnooze,
  onSendReminder,
  onEdit,
  onDelete,
  onSkip,
}: TimelineEventCardProps) {
  const Icon = KIND_ICON[event.kind] ?? Clock;
  const isClosed = event.status === "Done" || event.status === "Skipped";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-start">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          KIND_TONE[event.kind],
        )}
      >
        <Icon className="size-5" />
      </span>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{event.title}</span>
          <StatusBadge tone={STATUS_TONE[event.status]}>
            {timelineEventStatusLabels[event.status]}
          </StatusBadge>
          <span className="text-xs text-muted-foreground">
            {timelineEventKindLabels[event.kind]}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <Link
            href={`/vehicles/${event.vehicleId}`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <Car className="size-3.5" />
            {event.vehicleLabel}
            {event.licensePlate && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
                {event.licensePlate}
              </span>
            )}
          </Link>
          {event.customerFullName && (
            <Link
              href={`/clients/${event.customerId}`}
              className="hover:text-foreground"
            >
              · {event.customerFullName}
            </Link>
          )}
          {event.dueAt && (
            <span>
              · Échéance {dateFormatter.format(new Date(event.dueAt))}
            </span>
          )}
          {event.dueMileage && (
            <span>· {numberFormatter.format(event.dueMileage)} km</span>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onComplete(event)}
          disabled={isClosed}
        >
          <CheckCircle2 />
          Marquer fait
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSnooze(event)}
          disabled={isClosed}
        >
          <Clock />
          Reporter
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSendReminder(event)}
          disabled={isClosed}
        >
          <Bell />
          Rappel
        </Button>
        <RowActions
          actions={[
            {
              label: "Modifier",
              icon: <Pencil />,
              onSelect: () => onEdit(event),
            },
            {
              label: "Ignorer",
              icon: <Clock />,
              onSelect: () => onSkip(event),
            },
            {
              label: "Supprimer",
              icon: <Trash2 />,
              onSelect: () => onDelete(event),
              variant: "destructive",
              separatorBefore: true,
            },
          ]}
        />
      </div>
    </div>
  );
}
