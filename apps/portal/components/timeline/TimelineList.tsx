"use client";

import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineEventCard } from "@/components/timeline/TimelineEventCard";
import type { TimelineEvent } from "@/lib/api/timeline";

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

interface MonthGroup {
  key: string;
  label: string;
  events: TimelineEvent[];
}

function groupByMonth(events: TimelineEvent[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  const undated: TimelineEvent[] = [];

  for (const e of events) {
    if (!e.dueAt) {
      undated.push(e);
      continue;
    }
    const d = new Date(e.dueAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: capitalize(monthFormatter.format(d)),
        events: [],
      });
    }
    groups.get(key)!.events.push(e);
  }

  const sorted = Array.from(groups.values()).sort((a, b) =>
    a.key.localeCompare(b.key),
  );

  if (undated.length > 0) {
    sorted.push({
      key: "no-date",
      label: "Sans échéance datée",
      events: undated,
    });
  }
  return sorted;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

export interface TimelineListProps {
  events: TimelineEvent[];
  loading: boolean;
  onComplete: (event: TimelineEvent) => void;
  onSnooze: (event: TimelineEvent) => void;
  onSendReminder: (event: TimelineEvent) => void;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (event: TimelineEvent) => void;
  onSkip: (event: TimelineEvent) => void;
}

export function TimelineList({
  events,
  loading,
  onComplete,
  onSnooze,
  onSendReminder,
  onEdit,
  onDelete,
  onSkip,
}: TimelineListProps) {
  const groups = useMemo(() => groupByMonth(events), [events]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Aucun événement à afficher"
        description="Affinez vos filtres ou créez un événement manuel pour démarrer."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <div className="sticky top-0 z-10 -mx-2 bg-background/95 px-2 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {group.events.map((event) => (
              <TimelineEventCard
                key={event.id}
                event={event}
                onComplete={onComplete}
                onSnooze={onSnooze}
                onSendReminder={onSendReminder}
                onEdit={onEdit}
                onDelete={onDelete}
                onSkip={onSkip}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
