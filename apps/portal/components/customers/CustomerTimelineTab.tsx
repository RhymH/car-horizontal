"use client";

import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimelineList } from "@/components/timeline/TimelineList";
import { TimelineEventDialog } from "@/components/timeline/TimelineEventDialog";
import { SnoozeTimelineDialog } from "@/components/timeline/SnoozeTimelineDialog";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import {
  timelineApi,
  type TimelineEvent,
  type TimelineListParams,
} from "@/lib/api/timeline";
import { remindersApi } from "@/lib/api/reminders";
import type { TimelineEventStatusApi } from "@/lib/api/vehicles";

type StatusPreset = "all" | "upcoming" | "overdue" | "done";

const STATUS_LABELS: Record<StatusPreset, string> = {
  all: "Tous",
  upcoming: "À venir",
  overdue: "En retard",
  done: "Faits",
};

const STATUS_TO_API: Record<StatusPreset, TimelineEventStatusApi | undefined> = {
  all: undefined,
  upcoming: "Pending",
  overdue: "Triggered",
  done: "Done",
};

function buildDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 365);
  const to = new Date(now);
  to.setDate(to.getDate() + 365);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function CustomerTimelineTab({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusPreset>("all");
  const [editTarget, setEditTarget] = useState<TimelineEvent | null>(null);
  const [snoozeTarget, setSnoozeTarget] = useState<TimelineEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimelineEvent | null>(null);

  const params = useMemo<TimelineListParams>(() => {
    const { from, to } = buildDefaultRange();
    return {
      customerId,
      from,
      to,
      status: STATUS_TO_API[statusFilter],
      page: 1,
      pageSize: 200,
      sortDir: "asc",
    };
  }, [customerId, statusFilter]);

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
      await queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all() });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err, "Action impossible.")),
  });

  const skipMut = useMutation({
    mutationFn: (id: string) => timelineApi.skip(id),
    onSuccess: async () => {
      toast.info("Événement ignoré");
      await queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all() });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err, "Action impossible.")),
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

  const deleteMut = useMutation({
    mutationFn: (id: string) => timelineApi.remove(id),
    onSuccess: async () => {
      toast.success("Événement supprimé");
      await queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all() });
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Suppression impossible.")),
  });

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={statusFilter}
        onValueChange={(v) => v && setStatusFilter(v as StatusPreset)}
      >
        <TabsList size="sm">
          {(Object.keys(STATUS_LABELS) as StatusPreset[]).map((s) => (
            <TabsTrigger key={s} value={s}>
              {STATUS_LABELS[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
