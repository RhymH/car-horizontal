"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { appointmentStatusLabels, type Appointment } from "@/lib/api/appointments";
import { appointmentStatusTones } from "@/components/appointments/appointmentTones";
import { cn } from "@/lib/utils";

const HOUR_START = 7;
const HOUR_END = 20;
const HOUR_PX = 48;

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - day);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const fmt: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${weekStart.toLocaleDateString("fr-FR", fmt)} – ${end.toLocaleDateString("fr-FR", fmt)} ${end.getFullYear()}`;
}

export interface AppointmentCalendarProps {
  appointments: Appointment[];
  weekStart: Date;
  onWeekStartChange: (d: Date) => void;
  onSelect: (appointment: Appointment) => void;
  onCreateAt: (start: Date) => void;
}

export function AppointmentCalendar({
  appointments,
  weekStart,
  onWeekStartChange,
  onSelect,
  onCreateAt,
}: AppointmentCalendarProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const byDay = useMemo(() => {
    const buckets: Appointment[][] = days.map(() => []);
    for (const a of appointments) {
      const date = new Date(a.scheduledAt);
      const idx = days.findIndex((d) => sameDay(d, date));
      if (idx >= 0) buckets[idx].push(a);
    }
    return buckets;
  }, [appointments, days]);

  const totalHeight = (HOUR_END - HOUR_START) * HOUR_PX;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onWeekStartChange(addDays(weekStart, -7))}
            aria-label="Semaine précédente"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekStartChange(startOfWeek(new Date()))}
          >
            Aujourd&apos;hui
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onWeekStartChange(addDays(weekStart, 7))}
            aria-label="Semaine suivante"
          >
            <ChevronRight />
          </Button>
        </div>
        <span className="text-sm font-medium">{formatRange(weekStart)}</span>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-[64px_repeat(7,1fr)]">
          <div />
          {days.map((d, i) => (
            <div
              key={i}
              className={cn(
                "border-l border-border p-2 text-center text-xs",
                sameDay(d, today) && "bg-primary/5",
              )}
            >
              <div className="font-medium">{DAY_NAMES[i]}</div>
              <div className="text-muted-foreground">
                {d.toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </div>
            </div>
          ))}

          <div className="border-t border-border">
            {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
              <div
                key={i}
                style={{ height: HOUR_PX }}
                className="border-b border-border pr-1 pt-0.5 text-right text-[10px] text-muted-foreground"
              >
                {String(HOUR_START + i).padStart(2, "0")}h
              </div>
            ))}
          </div>

          {days.map((d, dayIdx) => (
            <div
              key={dayIdx}
              className="relative border-l border-t border-border"
              style={{ height: totalHeight }}
            >
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const start = new Date(d);
                    start.setHours(HOUR_START + i, 0, 0, 0);
                    onCreateAt(start);
                  }}
                  style={{ top: i * HOUR_PX, height: HOUR_PX }}
                  className="absolute inset-x-0 border-b border-border hover:bg-accent/40"
                  aria-label={`Créer un RDV ${HOUR_START + i}h`}
                />
              ))}

              {byDay[dayIdx].map((a) => {
                const start = new Date(a.scheduledAt);
                const startHour =
                  start.getHours() + start.getMinutes() / 60;
                const top = (startHour - HOUR_START) * HOUR_PX;
                const height = Math.max(
                  20,
                  (a.durationMinutes / 60) * HOUR_PX,
                );
                if (top + height < 0 || top > totalHeight) return null;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(a);
                    }}
                    style={{ top, height }}
                    className={cn(
                      "absolute inset-x-1 overflow-hidden rounded-md border border-border bg-card px-1.5 py-1 text-left text-[11px] shadow-sm transition-colors hover:bg-accent",
                      a.status === "Cancelled" && "opacity-60 line-through",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-medium">
                        {start.toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {a.subject}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-1">
                      <span className="truncate text-muted-foreground">
                        {a.customerFullName}
                      </span>
                      <StatusBadge
                        tone={appointmentStatusTones[a.status]}
                        className="px-1 py-0 text-[9px]"
                      >
                        {appointmentStatusLabels[a.status]}
                      </StatusBadge>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
