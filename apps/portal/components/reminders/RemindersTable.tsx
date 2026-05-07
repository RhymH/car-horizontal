"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Ban,
  Bell,
  Eye,
  Mail,
  MessageSquare,
  Pencil,
  Send,
  Smartphone,
  TimerReset,
} from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/RowActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  reminderChannelLabels,
  reminderStatusLabels,
  type Reminder,
  type ReminderChannelApi,
} from "@/lib/api/reminders";
import { reminderStatusTone } from "@/components/reminders/reminderTones";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const CHANNEL_ICON: Record<ReminderChannelApi, typeof Mail> = {
  Email: Mail,
  Sms: Smartphone,
  Both: MessageSquare,
};

export interface RemindersTableProps {
  reminders: Reminder[];
  loading: boolean;
  onPreview: (reminder: Reminder) => void;
  onSendNow: (reminder: Reminder) => void;
  onEdit: (reminder: Reminder) => void;
  onSnooze: (reminder: Reminder) => void;
  onCancel: (reminder: Reminder) => void;
}

function formatExcerpt(reminder: Reminder): string {
  const subject = reminder.resolvedSubject?.trim();
  if (subject) return subject;
  const body = reminder.resolvedBody?.trim();
  if (body) return body.slice(0, 80);
  if (reminder.timelineEventTitle) return reminder.timelineEventTitle;
  return "Rappel sans contenu personnalisé";
}

export function RemindersTable({
  reminders,
  loading,
  onPreview,
  onSendNow,
  onEdit,
  onSnooze,
  onCancel,
}: RemindersTableProps) {
  const columns = useMemo<ColumnDef<Reminder, unknown>[]>(
    () => [
      {
        id: "scheduledAt",
        accessorKey: "scheduledAt",
        header: "Date prévue",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">
              {dateFormatter.format(new Date(row.original.scheduledAt))}
            </span>
            {row.original.sentAt && (
              <span className="text-[11px] text-muted-foreground">
                Envoyé le {dateFormatter.format(new Date(row.original.sentAt))}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "customer",
        header: "Client",
        cell: ({ row }) => (
          <Link
            href={`/clients/${row.original.customerId}`}
            className="font-medium hover:underline"
          >
            {row.original.customerFullName || "—"}
          </Link>
        ),
      },
      {
        id: "vehicle",
        header: "Véhicule",
        cell: ({ row }) => {
          if (!row.original.vehicleId) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <Link
              href={`/vehicles/${row.original.vehicleId}`}
              className="text-sm hover:underline"
            >
              {row.original.licensePlate && (
                <span className="mr-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
                  {row.original.licensePlate}
                </span>
              )}
              {row.original.vehicleLabel}
            </Link>
          );
        },
      },
      {
        id: "channel",
        accessorKey: "channel",
        header: "Canal",
        cell: ({ row }) => {
          const Icon = CHANNEL_ICON[row.original.channel] ?? Bell;
          return (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Icon className="size-3.5 text-muted-foreground" />
              {reminderChannelLabels[row.original.channel]}
            </span>
          );
        },
      },
      {
        id: "excerpt",
        header: "Sujet / Aperçu",
        cell: ({ row }) => (
          <span className="block max-w-[280px] truncate text-sm text-muted-foreground">
            {formatExcerpt(row.original)}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => (
          <StatusBadge tone={reminderStatusTone[row.original.status]}>
            {reminderStatusLabels[row.original.status]}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          const isSent = r.status === "Sent";
          const isCancelled = r.status === "Cancelled";
          const isClosed = isSent || isCancelled;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Aperçu"
                onClick={() => onPreview(r)}
              >
                <Eye />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Envoyer maintenant"
                onClick={() => onSendNow(r)}
                disabled={isClosed}
              >
                <Send />
              </Button>
              <RowActions
                actions={[
                  {
                    label: "Modifier",
                    icon: <Pencil />,
                    onSelect: () => onEdit(r),
                  },
                  {
                    label: "Reporter",
                    icon: <TimerReset />,
                    onSelect: () => onSnooze(r),
                  },
                  {
                    label: "Annuler",
                    icon: <Ban />,
                    onSelect: () => onCancel(r),
                    variant: "destructive",
                    separatorBefore: true,
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [onPreview, onSendNow, onEdit, onSnooze, onCancel],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Aucun rappel à afficher"
        description="Affinez vos filtres ou créez un rappel manuel pour démarrer."
      />
    );
  }

  return (
    <DataTable
      data={reminders}
      columns={columns}
      enableSearch={false}
      pageSize={20}
    />
  );
}
