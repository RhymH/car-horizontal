"use client";

import { Calendar, Clock, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { appointmentStatusLabels, type Appointment } from "@/lib/api/appointments";
import { appointmentStatusTones } from "@/components/appointments/appointmentTones";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface AppointmentListProps {
  appointments: Appointment[];
  loading?: boolean;
  onSelect: (appointment: Appointment) => void;
}

export function AppointmentList({
  appointments,
  loading,
  onSelect,
}: AppointmentListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Aucun rendez-vous"
        description="Aucun rendez-vous sur la période sélectionnée."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {appointments.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a)}
          className={cn(
            "group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{a.subject}</span>
              <span className="text-xs text-muted-foreground">
                {a.customerFullName}
                {a.vehicleLabel ? ` · ${a.vehicleLabel}` : ""}
                {a.licensePlate ? ` (${a.licensePlate})` : ""}
              </span>
            </div>
            <StatusBadge tone={appointmentStatusTones[a.status]}>
              {appointmentStatusLabels[a.status]}
            </StatusBadge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatDate(a.scheduledAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {formatTime(a.scheduledAt)} · {a.durationMinutes} min
            </span>
            {a.notes && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="size-3.5" />
                {a.notes}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
