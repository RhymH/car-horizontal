"use client";

import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CalendarRange, LayoutList, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerCombobox } from "@/components/vehicles/CustomerCombobox";
import { VehicleCombobox } from "@/components/timeline/VehicleCombobox";
import { TimelineList } from "@/components/timeline/TimelineList";
import { TimelineCalendarView } from "@/components/timeline/TimelineCalendarView";
import { TimelineEventDialog } from "@/components/timeline/TimelineEventDialog";
import { SnoozeTimelineDialog } from "@/components/timeline/SnoozeTimelineDialog";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import {
  timelineApi,
  timelineEventKindLabels,
  timelineEventKinds,
  timelineEventStatusLabels,
  timelineEventStatuses,
  type TimelineEvent,
  type TimelineEventKindApi,
  type TimelineListParams,
} from "@/lib/api/timeline";
import type { TimelineEventStatusApi } from "@/lib/api/vehicles";
import { remindersApi } from "@/lib/api/reminders";
import { cn } from "@/lib/utils";

type RangePreset = "week" | "month" | "3months" | "6months" | "all";

const RANGE_LABELS: Record<RangePreset, string> = {
  week: "Cette semaine",
  month: "Ce mois",
  "3months": "3 mois",
  "6months": "6 mois",
  all: "Tout",
};

const STATUS_ITEMS: Record<string, string> = {
  All: "Tous statuts",
  ...timelineEventStatusLabels,
};

const KIND_ITEMS: Record<string, string> = {
  All: "Tous types",
  ...timelineEventKindLabels,
};

function buildRange(preset: RangePreset): { from?: string; to?: string } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (preset) {
    case "week": {
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day);
      end.setDate(start.getDate() + 6);
      break;
    }
    case "month": {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1, 0);
      break;
    }
    case "3months": {
      end.setMonth(start.getMonth() + 3);
      break;
    }
    case "6months": {
      end.setMonth(start.getMonth() + 6);
      break;
    }
    case "all":
      return {};
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

export function TimelineView() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [range, setRange] = useState<RangePreset>("month");
  const [statusFilter, setStatusFilter] = useState<TimelineEventStatusApi | "All">(
    "All",
  );
  const [kindFilter, setKindFilter] = useState<TimelineEventKindApi | "All">("All");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TimelineEvent | null>(null);
  const [snoozeTarget, setSnoozeTarget] = useState<TimelineEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimelineEvent | null>(null);

  const params = useMemo<TimelineListParams>(() => {
    const { from, to } = buildRange(range);
    return {
      from,
      to,
      status: statusFilter === "All" ? undefined : statusFilter,
      kind: kindFilter === "All" ? undefined : kindFilter,
      customerId: customerId || undefined,
      vehicleId: vehicleId || undefined,
      page: 1,
      pageSize: 200,
      sortDir: "asc",
    };
  }, [range, statusFilter, kindFilter, customerId, vehicleId]);

  const list = useQuery({
    queryKey: queryKeys.timeline.list({ ...params }),
    queryFn: ({ signal }) => timelineApi.list(params, signal),
    placeholderData: keepPreviousData,
  });

  const events = list.data?.items ?? [];

  const completeMut = useMutation({
    mutationFn: (id: string) => timelineApi.complete(id),
    onSuccess: async () => {
      toast.success("Événement marqué comme fait");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.all(),
      });
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Action impossible.")),
  });

  const skipMut = useMutation({
    mutationFn: (id: string) => timelineApi.skip(id),
    onSuccess: async () => {
      toast.info("Événement ignoré");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.all(),
      });
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Action impossible.")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => timelineApi.remove(id),
    onSuccess: async () => {
      toast.success("Événement supprimé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.all(),
      });
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Suppression impossible.")),
  });

  const sendReminderMut = useMutation({
    mutationFn: (id: string) => remindersApi.createFromTimeline(id),
    onSuccess: async () => {
      toast.success("Rappel programmé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reminders.all(),
      });
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Création du rappel impossible.")),
  });

  const regenerateMut = useMutation({
    mutationFn: () => timelineApi.regenerate(),
    onSuccess: async (data) => {
      toast.success(
        data.inserted > 0
          ? `${data.inserted} nouvel(s) événement(s) générés`
          : "Aucun nouvel événement à générer",
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.all(),
      });
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Régénération impossible.")),
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Timeline"
        description="Vue chronologique des entretiens, contrôles et opportunités."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerateMut.mutate()}
              disabled={regenerateMut.isPending}
            >
              <RefreshCw
                className={cn(regenerateMut.isPending && "animate-spin")}
              />
              Régénérer
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              Événement manuel
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={range} onValueChange={(v) => v && setRange(v as RangePreset)}>
            <TabsList size="sm">
              {(Object.keys(RANGE_LABELS) as RangePreset[]).map((r) => (
                <TabsTrigger key={r} value={r}>
                  {RANGE_LABELS[r]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Select
            items={STATUS_ITEMS}
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter((v as TimelineEventStatusApi) ?? "All")
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Tous statuts</SelectItem>
              {timelineEventStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {timelineEventStatusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={KIND_ITEMS}
            value={kindFilter}
            onValueChange={(v) =>
              setKindFilter((v as TimelineEventKindApi) ?? "All")
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Tous types</SelectItem>
              {timelineEventKinds.map((k) => (
                <SelectItem key={k} value={k}>
                  {timelineEventKindLabels[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs
            value={view}
            onValueChange={(v) => v && setView(v as "list" | "calendar")}
            className="ml-auto"
          >
            <TabsList size="sm">
              <TabsTrigger value="list">
                <LayoutList />
                Liste
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarRange />
                Calendrier
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <CustomerCombobox
              value={customerId}
              onChange={(id) => setCustomerId(id ?? "")}
              placeholder="Filtrer par client…"
            />
          </div>
          <div className="flex-1">
            <VehicleCombobox
              value={vehicleId}
              onChange={(id) => setVehicleId(id ?? "")}
              placeholder="Filtrer par véhicule…"
            />
          </div>
          {(customerId || vehicleId) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCustomerId("");
                setVehicleId("");
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {view === "list" ? (
        <TimelineList
          events={events}
          loading={list.isLoading}
          onComplete={(e) => completeMut.mutate(e.id)}
          onSnooze={(e) => setSnoozeTarget(e)}
          onSendReminder={(e) => sendReminderMut.mutate(e.id)}
          onEdit={(e) => setEditTarget(e)}
          onDelete={(e) => setDeleteTarget(e)}
          onSkip={(e) => skipMut.mutate(e.id)}
        />
      ) : (
        <TimelineCalendarView
          events={events}
          onSelectEvent={(e) => setEditTarget(e)}
        />
      )}

      <TimelineEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode={{
          kind: "create",
          defaultVehicleId: vehicleId || undefined,
        }}
      />

      {editTarget && (
        <TimelineEventDialog
          open={editTarget !== null}
          onOpenChange={(o) => !o && setEditTarget(null)}
          mode={{ kind: "edit", event: editTarget }}
        />
      )}

      <SnoozeTimelineDialog
        open={snoozeTarget !== null}
        onOpenChange={(o) => !o && setSnoozeTarget(null)}
        event={snoozeTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer cet événement ?"
        description={
          deleteTarget
            ? `« ${deleteTarget.title} » sera définitivement supprimé.`
            : undefined
        }
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMut.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

    </div>
  );
}
