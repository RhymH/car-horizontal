"use client";

import Link from "next/link";
import { Frown, Megaphone } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LoyaltyCustomer } from "@/lib/api/loyalty";

interface Props {
  customers: LoyaltyCustomer[];
  loading?: boolean;
  onReactivate: (customer: LoyaltyCustomer) => void;
}

export function LostCustomersList({ customers, loading, onReactivate }: Props) {
  return (
    <SectionCard
      title="Perdus"
      description="Plus de 18 mois sans contact"
    >
      {loading ? (
        <ListSkeleton />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Frown}
          title="Aucun client perdu"
          description="Bonne nouvelle, aucun client n'a totalement décroché."
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
                  Dernière visite :{" "}
                  {c.lastContactAt
                    ? new Date(c.lastContactAt).toLocaleDateString("fr-FR")
                    : "—"}
                  {c.daysSinceLastContact
                    ? ` (${c.daysSinceLastContact} jours)`
                    : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReactivate(c)}
                title="Tenter de réactiver ce client"
              >
                <Megaphone className="size-4" />
                Réactiver
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
