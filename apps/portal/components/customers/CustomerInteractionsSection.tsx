"use client";

import { useState } from "react";
import {
  History,
  Mail,
  MessageSquare,
  MessageSquarePlus,
  Phone,
  StickyNote,
  Users as UsersIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  CustomerInteraction,
  InteractionTypeApi,
} from "@/lib/api/customers";
import { interactionTypeLabels } from "@/components/customers/AddInteractionDialog";

const TYPE_ICON: Record<InteractionTypeApi, LucideIcon> = {
  Call: Phone,
  Visit: UsersIcon,
  Sms: MessageSquare,
  Email: Mail,
  Note: StickyNote,
};

const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type FilterValue = InteractionTypeApi | "All";

export interface CustomerInteractionsSectionProps {
  interactions: CustomerInteraction[];
  onAdd: () => void;
}

export function CustomerInteractionsSection({
  interactions,
  onAdd,
}: CustomerInteractionsSectionProps) {
  const [filter, setFilter] = useState<FilterValue>("All");
  const [visible, setVisible] = useState(10);

  const filtered = interactions.filter(
    (i) => filter === "All" || i.type === filter,
  );
  const slice = filtered.slice(0, visible);

  return (
    <SectionCard
      title="Historique des interactions"
      description={
        interactions.length === 0
          ? "Aucune interaction enregistrée"
          : `${filtered.length} interaction(s)`
      }
      actions={
        <div className="flex gap-2">
          <Select
            value={filter}
            onValueChange={(v) => {
              setFilter(v as FilterValue);
              setVisible(10);
            }}
          >
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Tous</SelectItem>
              {(Object.keys(interactionTypeLabels) as InteractionTypeApi[]).map(
                (t) => (
                  <SelectItem key={t} value={t}>
                    {interactionTypeLabels[t]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <MessageSquarePlus />
            Ajouter
          </Button>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Aucune interaction"
          description="Ajoutez un appel, une visite ou une note pour commencer l'historique."
          action={
            <Button size="sm" onClick={onAdd}>
              <MessageSquarePlus />
              Nouvelle interaction
            </Button>
          }
        />
      ) : (
        <ol className="relative space-y-4 pl-6">
          <span
            aria-hidden
            className="absolute left-2 top-1.5 bottom-1.5 w-px bg-border"
          />
          {slice.map((i) => {
            const Icon = TYPE_ICON[i.type];
            return (
              <li key={i.id} className="relative">
                <span className="absolute -left-6 top-1 flex size-4 items-center justify-center rounded-full bg-primary/10 ring-2 ring-background">
                  <Icon className="size-2.5 text-primary" />
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-medium uppercase tracking-wide">
                      {interactionTypeLabels[i.type]}
                    </span>
                    <time dateTime={i.occurredAt}>
                      {dateTimeFmt.format(new Date(i.occurredAt))}
                    </time>
                  </div>
                  <p className="mt-0.5 text-sm leading-snug">{i.summary}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {filtered.length > visible && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible((n) => n + 10)}
          >
            Charger plus
          </Button>
        </div>
      )}
    </SectionCard>
  );
}
