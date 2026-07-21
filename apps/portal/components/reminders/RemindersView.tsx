"use client";

import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
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
import { RemindersTable } from "@/components/reminders/RemindersTable";
import { ReminderFormDialog } from "@/components/reminders/ReminderFormDialog";
import { ReminderPreviewDialog } from "@/components/reminders/ReminderPreviewDialog";
import { SendNowDialog } from "@/components/reminders/SendNowDialog";
import { SnoozeReminderDialog } from "@/components/reminders/SnoozeReminderDialog";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import {
  reminderChannelLabels,
  reminderChannels,
  reminderStatusLabels,
  remindersApi,
  type Reminder,
  type ReminderChannelApi,
  type ReminderListParams,
  type ReminderStatusApi,
} from "@/lib/api/reminders";
import { cn } from "@/lib/utils";

type RangePreset = "week" | "month" | "3months" | "all";

const RANGE_LABELS: Record<RangePreset, string> = {
  week: "Cette semaine",
  month: "Ce mois",
  "3months": "3 mois",
  all: "Toutes",
};

const TAB_FILTERS: Record<string, ReminderStatusApi | "All"> = {
  Scheduled: "Scheduled",
  Sent: "Sent",
  Failed: "Failed",
  Cancelled: "Cancelled",
  All: "All",
};

const TAB_LABELS: Record<keyof typeof TAB_FILTERS, string> = {
  Scheduled: "Programmés",
  Sent: "Envoyés",
  Failed: "Échoués",
  Cancelled: "Annulés",
  All: "Tous",
};

const CHANNEL_ITEMS: Record<string, string> = {
  All: "Tous canaux",
  ...reminderChannelLabels,
};

function buildRange(preset: RangePreset): { from?: string; to?: string } {
  if (preset === "all") return {};
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (preset === "week") {
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    end.setDate(start.getDate() + 6);
  } else if (preset === "month") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  } else if (preset === "3months") {
    end.setMonth(start.getMonth() + 3);
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

export function RemindersView() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<keyof typeof TAB_FILTERS>("Scheduled");
  const [range, setRange] = useState<RangePreset>("month");
  const [channelFilter, setChannelFilter] = useState<
    ReminderChannelApi | "All"
  >("All");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Reminder | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Reminder | null>(null);
  const [sendNowTarget, setSendNowTarget] = useState<Reminder | null>(null);
  const [snoozeTarget, setSnoozeTarget] = useState<Reminder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reminder | null>(null);

  const params = useMemo<ReminderListParams>(() => {
    const status = TAB_FILTERS[tab];
    const { from, to } = buildRange(range);
    return {
      status: status === "All" ? undefined : status,
      channel: channelFilter === "All" ? undefined : channelFilter,
      from,
      to,
      page: 1,
      pageSize: 200,
      sortDir: "asc",
    };
  }, [tab, range, channelFilter]);

  const list = useQuery({
    queryKey: queryKeys.reminders.list({ ...params }),
    queryFn: ({ signal }) => remindersApi.list(params, signal),
    placeholderData: keepPreviousData,
  });

  const reminders = list.data?.items ?? [];

  const ensureMut = useMutation({
    mutationFn: () => remindersApi.ensure(),
    onSuccess: async (data) => {
      toast.success(
        data.inserted > 0
          ? `${data.inserted} rappel(s) générés depuis la timeline`
          : "Aucun nouveau rappel à générer",
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reminders.all(),
      });
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Génération impossible.")),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => remindersApi.cancel(id),
    onSuccess: async () => {
      toast.success("Rappel annulé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reminders.all(),
      });
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Annulation impossible.")),
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Rappels"
        description="Rappels SMS et email programmés pour vos clients."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => ensureMut.mutate()}
              disabled={ensureMut.isPending}
            >
              <RefreshCw
                className={cn(ensureMut.isPending && "animate-spin")}
              />
              Synchroniser depuis la timeline
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              Nouveau rappel
            </Button>
          </div>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => v && setTab(v as keyof typeof TAB_FILTERS)}
      >
        <TabsList>
          {(Object.keys(TAB_FILTERS) as (keyof typeof TAB_FILTERS)[]).map(
            (key) => (
              <TabsTrigger key={key} value={key}>
                {TAB_LABELS[key]}
              </TabsTrigger>
            ),
          )}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/50 p-3">
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
          items={CHANNEL_ITEMS}
          value={channelFilter}
          onValueChange={(v) =>
            setChannelFilter((v as ReminderChannelApi) ?? "All")
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Tous canaux</SelectItem>
            {reminderChannels.map((c) => (
              <SelectItem key={c} value={c}>
                {reminderChannelLabels[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-muted-foreground">
          {list.data?.total ?? 0} rappel(s)
        </span>
      </div>

      <RemindersTable
        reminders={reminders}
        loading={list.isLoading}
        onPreview={setPreviewTarget}
        onSendNow={setSendNowTarget}
        onEdit={setEditTarget}
        onSnooze={setSnoozeTarget}
        onCancel={setCancelTarget}
      />

      <ReminderFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode={{ kind: "create" }}
      />

      {editTarget && (
        <ReminderFormDialog
          open={editTarget !== null}
          onOpenChange={(o) => !o && setEditTarget(null)}
          mode={{ kind: "edit", reminder: editTarget }}
        />
      )}

      <ReminderPreviewDialog
        open={previewTarget !== null}
        onOpenChange={(o) => !o && setPreviewTarget(null)}
        reminder={previewTarget}
      />

      <SendNowDialog
        open={sendNowTarget !== null}
        onOpenChange={(o) => !o && setSendNowTarget(null)}
        reminder={sendNowTarget}
      />

      <SnoozeReminderDialog
        open={snoozeTarget !== null}
        onOpenChange={(o) => !o && setSnoozeTarget(null)}
        reminder={snoozeTarget}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Annuler ce rappel ?"
        description={
          cancelTarget
            ? `Le rappel programmé pour ${cancelTarget.customerFullName} (${reminderStatusLabels[cancelTarget.status]}) sera annulé.`
            : undefined
        }
        confirmLabel="Annuler le rappel"
        variant="destructive"
        onConfirm={async () => {
          if (!cancelTarget) return;
          await cancelMut.mutateAsync(cancelTarget.id);
          setCancelTarget(null);
        }}
      />
    </div>
  );
}
