"use client";

import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  CheckCheck,
  List,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DetailDrawer,
  DetailDrawerSection,
} from "@/components/ui/DetailDrawer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { AppointmentFormDialog } from "@/components/appointments/AppointmentFormDialog";
import { appointmentStatusTones } from "@/components/appointments/appointmentTones";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import {
  appointmentStatusLabels,
  appointmentsApi,
  type Appointment,
  type AppointmentListParams,
} from "@/lib/api/appointments";

type ViewMode = "calendar" | "list";

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

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AppointmentsView() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("calendar");
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date()),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createPreset, setCreatePreset] = useState<string | undefined>(
    undefined,
  );
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [detailTarget, setDetailTarget] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);

  const params = useMemo<AppointmentListParams>(() => {
    if (view === "calendar") {
      const from = weekStart;
      const to = addDays(weekStart, 7);
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        page: 1,
        pageSize: 200,
        sortDir: "asc",
      };
    }
    const ref = new Date();
    return {
      from: startOfMonth(ref).toISOString(),
      to: endOfMonth(ref).toISOString(),
      page: 1,
      pageSize: 200,
      sortDir: "asc",
    };
  }, [view, weekStart]);

  const list = useQuery({
    queryKey: queryKeys.appointments.list({ ...params }),
    queryFn: ({ signal }) => appointmentsApi.list(params, signal),
    placeholderData: keepPreviousData,
  });

  const appointments = list.data?.items ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });

  const transitionMut = useMutation({
    mutationFn: async (input: {
      id: string;
      action: "confirm" | "cancel" | "done";
    }) => {
      if (input.action === "confirm") return appointmentsApi.confirm(input.id);
      if (input.action === "cancel") return appointmentsApi.cancel(input.id);
      return appointmentsApi.done(input.id);
    },
    onSuccess: async (data, input) => {
      const labels: Record<typeof input.action, string> = {
        confirm: "Rendez-vous confirmé",
        cancel: "Rendez-vous annulé",
        done: "Rendez-vous marqué effectué",
      };
      toast.success(labels[input.action]);
      setDetailTarget(data);
      await invalidate();
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Action impossible.")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id),
    onSuccess: async () => {
      toast.success("Rendez-vous supprimé");
      setDeleteTarget(null);
      setDetailTarget(null);
      await invalidate();
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Suppression impossible.")),
  });

  const openCreateAt = (start: Date) => {
    setCreatePreset(start.toISOString());
    setCreateOpen(true);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Rendez-vous"
        description="Planifiez les passages au garage et suivez le statut."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setCreatePreset(undefined);
              setCreateOpen(true);
            }}
          >
            <Plus />
            Nouveau RDV
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-2">
        <Tabs
          value={view}
          onValueChange={(v) => v && setView(v as ViewMode)}
        >
          <TabsList>
            <TabsTrigger value="calendar">
              <CalendarDays className="size-4" />
              Calendrier
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="size-4" />
              Liste
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground">
          {list.data?.total ?? 0} rendez-vous
        </span>
      </div>

      {view === "calendar" ? (
        <AppointmentCalendar
          appointments={appointments}
          weekStart={weekStart}
          onWeekStartChange={setWeekStart}
          onSelect={setDetailTarget}
          onCreateAt={openCreateAt}
        />
      ) : (
        <AppointmentList
          appointments={appointments}
          loading={list.isLoading}
          onSelect={setDetailTarget}
        />
      )}

      <AppointmentFormDialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setCreatePreset(undefined);
        }}
        mode={{ kind: "create", presetScheduledAt: createPreset }}
      />

      {editTarget && (
        <AppointmentFormDialog
          open={editTarget !== null}
          onOpenChange={(o) => !o && setEditTarget(null)}
          mode={{ kind: "edit", appointment: editTarget }}
        />
      )}

      <DetailDrawer
        open={detailTarget !== null}
        onOpenChange={(o) => !o && setDetailTarget(null)}
        title={detailTarget?.subject ?? "Rendez-vous"}
        description={
          detailTarget
            ? `${formatDateLong(detailTarget.scheduledAt)} · ${formatTime(detailTarget.scheduledAt)}`
            : undefined
        }
        actions={
          detailTarget ? (
            <StatusBadge tone={appointmentStatusTones[detailTarget.status]}>
              {appointmentStatusLabels[detailTarget.status]}
            </StatusBadge>
          ) : undefined
        }
      >
        {detailTarget && (
          <div className="flex flex-col">
            <DetailDrawerSection title="Client">
              <div className="font-medium">{detailTarget.customerFullName}</div>
              {detailTarget.customerEmail && (
                <div className="text-muted-foreground">
                  {detailTarget.customerEmail}
                </div>
              )}
              {detailTarget.customerPhone && (
                <div className="text-muted-foreground">
                  {detailTarget.customerPhone}
                </div>
              )}
            </DetailDrawerSection>

            {detailTarget.vehicleLabel && (
              <DetailDrawerSection title="Véhicule">
                <div>
                  {detailTarget.vehicleLabel}
                  {detailTarget.licensePlate
                    ? ` · ${detailTarget.licensePlate}`
                    : ""}
                </div>
              </DetailDrawerSection>
            )}

            <DetailDrawerSection title="Durée">
              {detailTarget.durationMinutes} minutes
            </DetailDrawerSection>

            {detailTarget.notes && (
              <DetailDrawerSection title="Notes">
                <p className="whitespace-pre-wrap">{detailTarget.notes}</p>
              </DetailDrawerSection>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={
                  detailTarget.status === "Confirmed" ||
                  detailTarget.status === "Cancelled" ||
                  detailTarget.status === "Done" ||
                  transitionMut.isPending
                }
                onClick={() =>
                  transitionMut.mutate({
                    id: detailTarget.id,
                    action: "confirm",
                  })
                }
              >
                <CheckCircle2 className="size-4" />
                Confirmer
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  detailTarget.status === "Done" ||
                  detailTarget.status === "Cancelled" ||
                  transitionMut.isPending
                }
                onClick={() =>
                  transitionMut.mutate({
                    id: detailTarget.id,
                    action: "done",
                  })
                }
              >
                <CheckCheck className="size-4" />
                Marquer effectué
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  detailTarget.status === "Cancelled" ||
                  detailTarget.status === "Done" ||
                  transitionMut.isPending
                }
                onClick={() =>
                  transitionMut.mutate({
                    id: detailTarget.id,
                    action: "cancel",
                  })
                }
              >
                <XCircle className="size-4" />
                Annuler
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  detailTarget.status === "Cancelled" ||
                  detailTarget.status === "Done"
                }
                onClick={() => {
                  setEditTarget(detailTarget);
                  setDetailTarget(null);
                }}
              >
                <Pencil className="size-4" />
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="col-span-2 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(detailTarget)}
              >
                <Trash2 className="size-4" />
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer ce rendez-vous ?"
        description={
          deleteTarget
            ? `« ${deleteTarget.subject} » sera supprimé définitivement.`
            : undefined
        }
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMut.mutateAsync(deleteTarget.id);
        }}
      />
    </div>
  );
}
