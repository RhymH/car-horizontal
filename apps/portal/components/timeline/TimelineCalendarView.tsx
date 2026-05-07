"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  timelineEventKindLabels,
  type TimelineEvent,
  type TimelineEventKindApi,
} from "@/lib/api/timeline";

const KIND_DOT: Record<TimelineEventKindApi, string> = {
  Maintenance: "bg-blue-500",
  TechnicalInspection: "bg-emerald-500",
  TireSwap: "bg-cyan-500",
  TradeInOpportunity: "bg-purple-500",
  WarrantyExpiry: "bg-amber-500",
  Custom: "bg-muted-foreground",
};

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export interface TimelineCalendarViewProps {
  events: TimelineEvent[];
  onSelectEvent: (event: TimelineEvent) => void;
}

export function TimelineCalendarView({
  events,
  onSelectEvent,
}: TimelineCalendarViewProps) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const grid = useMemo(() => buildMonthGrid(cursor, events), [cursor, events]);

  const prev = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const next = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={prev} aria-label="Mois précédent">
          <ChevronLeft />
        </Button>
        <h3 className="text-sm font-semibold capitalize">
          {monthFormatter.format(cursor)}
        </h3>
        <Button variant="ghost" size="icon-sm" onClick={next} aria-label="Mois suivant">
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-muted-foreground">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((day) => {
          const isToday =
            day.date.toDateString() === today.toDateString() && day.inMonth;
          return (
            <div
              key={day.key}
              className={cn(
                "flex min-h-20 flex-col gap-0.5 rounded-md border border-border/50 bg-background/50 p-1 text-left text-xs",
                !day.inMonth && "opacity-40",
                isToday && "border-primary",
              )}
            >
              <span
                className={cn(
                  "font-medium",
                  isToday && "text-primary",
                )}
              >
                {day.date.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {day.events.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelectEvent(e)}
                    className="flex items-center gap-1 truncate rounded bg-accent/40 px-1 py-0.5 text-[10px] text-left hover:bg-accent"
                    title={`${timelineEventKindLabels[e.kind]} — ${e.title}`}
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", KIND_DOT[e.kind])} />
                    <span className="truncate">{e.title}</span>
                  </button>
                ))}
                {day.events.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{day.events.length - 3} autres
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-muted-foreground">
        {(Object.keys(KIND_DOT) as TimelineEventKindApi[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className={cn("size-2 rounded-full", KIND_DOT[k])} />
            {timelineEventKindLabels[k]}
          </span>
        ))}
        <span className="ml-auto text-[10px]">
          Aujourd&apos;hui : {dayFormatter.format(today)}
        </span>
      </div>
    </div>
  );
}

interface DayCell {
  key: string;
  date: Date;
  inMonth: boolean;
  events: TimelineEvent[];
}

function buildMonthGrid(cursor: Date, events: TimelineEvent[]): DayCell[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const startWeekday = (first.getDay() + 6) % 7; // Mon=0
  const cells: DayCell[] = [];

  for (let i = startWeekday; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    cells.push({
      key: `pre-${d.toISOString()}`,
      date: d,
      inMonth: false,
      events: [],
    });
  }

  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(year, month, d);
    cells.push({
      key: `m-${date.toISOString()}`,
      date,
      inMonth: true,
      events: events.filter(
        (e) => e.dueAt && sameDay(new Date(e.dueAt), date),
      ),
    });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({
      key: `post-${d.toISOString()}`,
      date: d,
      inMonth: false,
      events: [],
    });
  }

  return cells;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
