"use client";

import { Bell, CalendarClock } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type {
  TimelineEventStatusApi,
  VehicleTimelineEvent,
} from "@/lib/api/vehicles";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const STATUS_TONE: Record<
  TimelineEventStatusApi,
  "success" | "neutral" | "info" | "warning" | "danger"
> = {
  Pending: "info",
  Sent: "warning",
  Done: "success",
  Snoozed: "neutral",
  Cancelled: "neutral",
};

const STATUS_LABEL: Record<TimelineEventStatusApi, string> = {
  Pending: "À faire",
  Sent: "Rappel envoyé",
  Done: "Fait",
  Snoozed: "Reporté",
  Cancelled: "Annulé",
};

const numberFormatter = new Intl.NumberFormat("fr-FR");

export interface VehicleTimelineSectionProps {
  events: VehicleTimelineEvent[];
  onMarkDone: (event: VehicleTimelineEvent) => void;
  onSnooze: (event: VehicleTimelineEvent) => void;
  onSendReminder: (event: VehicleTimelineEvent) => void;
}

export function VehicleTimelineSection({
  events,
  onMarkDone,
  onSnooze,
  onSendReminder,
}: VehicleTimelineSectionProps) {
  return (
    <SectionCard
      title="Timeline"
      description={
        events.length === 0
          ? "Aucun événement programmé"
          : `${events.length} événement(s)`
      }
    >
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Aucun événement à venir"
          description="Les rappels d'entretien apparaîtront ici dès qu'une règle ou un entretien planifié les générera."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{event.title}</span>
                  <StatusBadge tone={STATUS_TONE[event.status]}>
                    {STATUS_LABEL[event.status]}
                  </StatusBadge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {event.dueAt && (
                    <span>
                      Échéance{" "}
                      {dateFormatter.format(new Date(event.dueAt))}
                    </span>
                  )}
                  {event.dueMileage && (
                    <span>
                      ou {numberFormatter.format(event.dueMileage)} km
                    </span>
                  )}
                  {event.description && <span>· {event.description}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMarkDone(event)}
                  disabled={event.status === "Done"}
                >
                  Marquer fait
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSnooze(event)}
                  disabled={event.status === "Done" || event.status === "Cancelled"}
                >
                  Reporter
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSendReminder(event)}
                  disabled={event.status === "Done" || event.status === "Cancelled"}
                >
                  <Bell />
                  Rappel
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
