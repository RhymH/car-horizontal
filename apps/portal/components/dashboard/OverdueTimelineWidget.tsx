"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { DashboardOverdueTimelineEvent } from "@/lib/api/dashboard";

interface Props {
  items: DashboardOverdueTimelineEvent[];
  loading?: boolean;
  limit?: number;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function OverdueTimelineWidget({ items, loading, limit = 5 }: Props) {
  const visible = items.slice(0, limit);

  return (
    <SectionCard
      title="Événements en retard"
      description="Échéances dépassées à traiter"
      actions={
        <Link
          href="/timeline"
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
          icon={ShieldCheck}
          title="Tout est à jour"
          description="Aucune échéance en retard. Bon travail !"
        />
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                    <AlertTriangle className="size-3.5" />
                  </span>
                  <Link
                    href={`/vehicles/${e.vehicleId}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {e.title}
                  </Link>
                  {e.severity && (
                    <StatusBadge
                      tone={
                        e.severity === "Critical"
                          ? "danger"
                          : e.severity === "Recommended"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {e.severity}
                    </StatusBadge>
                  )}
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
                      <span>Échue {dateFmt.format(new Date(e.dueAt))}</span>
                    </>
                  )}
                </div>
              </div>
              {typeof e.daysOverdue === "number" && (
                <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  +{e.daysOverdue}j
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
