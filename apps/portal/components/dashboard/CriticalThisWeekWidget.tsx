"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CircleCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { remindersApi } from "@/lib/api/reminders";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import type { DashboardCriticalThisWeek } from "@/lib/api/dashboard";

interface Props {
  items: DashboardCriticalThisWeek[];
  loading?: boolean;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

export function CriticalThisWeekWidget({ items, loading }: Props) {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const createReminder = useMutation({
    mutationFn: (timelineEventId: string) =>
      remindersApi.createFromTimeline(timelineEventId, { channel: "Email" }),
    onMutate: (id) => setPendingId(id),
    onSuccess: async () => {
      toast.success("Rappel créé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.overview(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reminders.all(),
      });
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Création impossible.")),
    onSettled: () => setPendingId(null),
  });

  return (
    <SectionCard
      title="À faire cette semaine"
      description="Événements critiques dans les 7 prochains jours"
      actions={
        <span className="text-xs text-muted-foreground">
          {items.length} événement(s)
        </span>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="Aucun événement critique"
          description="Pas de critique dans les 7 prochains jours."
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((e) => {
            const isPending = pendingId === e.id;
            return (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <CalendarClock className="size-3.5" />
                    </span>
                    <Link
                      href={`/vehicles/${e.vehicleId}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {e.title}
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-9 text-xs text-muted-foreground">
                    <Link
                      href={`/clients/${e.customerId}`}
                      className="hover:underline"
                    >
                      {e.customerFullName}
                    </Link>
                    {e.vehicleLabel && (
                      <>
                        <span>·</span>
                        <span className="truncate">
                          {e.vehicleLabel}
                          {e.licensePlate ? ` · ${e.licensePlate}` : ""}
                        </span>
                      </>
                    )}
                    {e.dueAt && (
                      <>
                        <span>·</span>
                        <span className="capitalize">
                          {dateFmt.format(new Date(e.dueAt))}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {e.hasActiveReminder ? (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CircleCheck className="size-3" />
                    Programmé
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    disabled={isPending}
                    onClick={() => createReminder.mutate(e.id)}
                  >
                    <Send className="size-4" />
                    Envoyer rappel
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
