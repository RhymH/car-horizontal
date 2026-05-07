"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bell, Mail, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { remindersApi } from "@/lib/api/reminders";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { reminderStatusTone } from "@/components/reminders/reminderTones";
import type {
  DashboardUpcomingReminder,
} from "@/lib/api/dashboard";
import { cn } from "@/lib/utils";

interface Props {
  items: DashboardUpcomingReminder[];
  loading?: boolean;
  limit?: number;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function ChannelIcon({ channel }: { channel: string }) {
  const c = channel.toLowerCase();
  if (c === "sms") return <MessageSquare className="size-3.5" />;
  if (c === "both") return <Bell className="size-3.5" />;
  return <Mail className="size-3.5" />;
}

export function UpcomingRemindersWidget({ items, loading, limit = 5 }: Props) {
  const queryClient = useQueryClient();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const sendNow = useMutation({
    mutationFn: (id: string) => remindersApi.sendNow(id),
    onMutate: (id) => setSendingId(id),
    onSuccess: async () => {
      toast.success("Rappel envoyé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.overview(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reminders.all(),
      });
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Envoi impossible.")),
    onSettled: () => setSendingId(null),
  });

  const visible = items.slice(0, limit);

  return (
    <SectionCard
      title="Rappels à venir"
      description="Les 5 prochains envois programmés"
      actions={
        <Link
          href="/reminders"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Voir tous
          <ArrowRight className="size-3" />
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucun rappel programmé"
          description="Synchronisez la timeline pour générer des rappels automatiquement."
          action={
            <Link
              href="/reminders"
              className="text-sm font-medium text-primary hover:underline"
            >
              Aller aux rappels
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((r) => {
            const tone =
              reminderStatusTone[
                r.status as keyof typeof reminderStatusTone
              ] ?? "info";
            const isSending = sendingId === r.id;
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={tone} className="gap-1">
                      <ChannelIcon channel={r.channel} />
                      {r.channel}
                    </StatusBadge>
                    <Link
                      href={`/clients/${r.customerId}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {r.customerFullName}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{dateFmt.format(new Date(r.scheduledAt))}</span>
                    {r.vehicleLabel && (
                      <>
                        <span>·</span>
                        <span className="truncate">
                          {r.vehicleLabel}
                          {r.licensePlate ? ` · ${r.licensePlate}` : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("shrink-0", isSending && "opacity-60")}
                  disabled={isSending}
                  onClick={() => sendNow.mutate(r.id)}
                  title="Envoyer maintenant"
                >
                  <Send className="size-4" />
                  Envoyer
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
