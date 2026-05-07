"use client";

import Link from "next/link";
import {
  Activity,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Store,
  type LucideIcon,
} from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DashboardRecentInteraction } from "@/lib/api/dashboard";

interface Props {
  items: DashboardRecentInteraction[];
  loading?: boolean;
}

const TYPE_ICON: Record<string, LucideIcon> = {
  Call: Phone,
  Visit: Store,
  Sms: MessageSquare,
  Email: Mail,
  Note: StickyNote,
};

const TYPE_LABEL: Record<string, string> = {
  Call: "Appel",
  Visit: "Visite",
  Sms: "SMS",
  Email: "Email",
  Note: "Note",
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function RecentActivityWidget({ items, loading }: Props) {
  return (
    <SectionCard
      title="Activité récente"
      description="Dernières interactions clients"
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Aucune activité récente"
          description="Les interactions clients (appels, visites, notes) apparaîtront ici."
        />
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-5">
          {items.map((it) => {
            const Icon = TYPE_ICON[it.type] ?? Activity;
            return (
              <li key={it.id} className="relative">
                <span className="absolute -left-[27px] top-0.5 flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                  <Icon className="size-3" />
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Link
                      href={`/clients/${it.customerId}`}
                      className="font-medium hover:underline"
                    >
                      {it.customerFullName}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      · {TYPE_LABEL[it.type] ?? it.type}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {dateFmt.format(new Date(it.occurredAt))}
                    </span>
                  </div>
                  {it.summary && (
                    <p className="text-xs text-muted-foreground">
                      {it.summary}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}
