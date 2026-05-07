"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LoyaltyCustomer } from "@/lib/api/loyalty";
import { Heart } from "lucide-react";

interface Props {
  customers: LoyaltyCustomer[];
  loading?: boolean;
  onRelaunch: (customer: LoyaltyCustomer) => void;
  onBulk?: () => void;
}

export function AtRiskList({ customers, loading, onRelaunch, onBulk }: Props) {
  return (
    <SectionCard
      title="À risque"
      description="Sans contact depuis 12 à 18 mois — à relancer rapidement"
      actions={
        onBulk && customers.length > 0 ? (
          <Button size="sm" variant="outline" onClick={onBulk}>
            <Megaphone className="size-4" /> Relancer tout
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <ListSkeleton />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Aucun client à risque"
          description="Les clients récents restent en contact régulier."
        />
      ) : (
        <ul className="divide-y divide-border">
          {customers.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <Link
                  href={`/clients/${c.id}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {c.fullName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {c.daysSinceLastContact ?? "—"} jours sans contact
                  {c.city ? ` · ${c.city}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRelaunch(c)}
                title="Relancer ce client"
              >
                <Megaphone className="size-4" />
                Relancer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded bg-muted/40" />
      ))}
    </div>
  );
}
