"use client";

import { useState } from "react";
import { StickyNote } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { VehicleNote } from "@/lib/api/vehicles";

const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export interface VehicleNotesSectionProps {
  notes: VehicleNote[];
  onAdd: () => void;
}

export function VehicleNotesSection({ notes, onAdd }: VehicleNotesSectionProps) {
  const [visible, setVisible] = useState(10);
  const slice = notes.slice(0, visible);

  return (
    <SectionCard
      title="Notes"
      description={
        notes.length === 0 ? "Aucune note" : `${notes.length} note(s)`
      }
      actions={
        <Button variant="outline" size="sm" onClick={onAdd}>
          <StickyNote />
          Ajouter
        </Button>
      }
    >
      {notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Aucune note"
          description="Consignez une observation atelier ou une remarque pour garder une trace sur ce véhicule."
          action={
            <Button size="sm" onClick={onAdd}>
              <StickyNote />
              Nouvelle note
            </Button>
          }
        />
      ) : (
        <ol className="relative space-y-4 pl-6">
          <span
            aria-hidden
            className="absolute left-2 top-1.5 bottom-1.5 w-px bg-border"
          />
          {slice.map((n) => (
            <li key={n.id} className="relative">
              <span className="absolute -left-6 top-1 flex size-4 items-center justify-center rounded-full bg-primary/10 ring-2 ring-background">
                <StickyNote className="size-2.5 text-primary" />
              </span>
              <div className="flex flex-col">
                <time
                  dateTime={n.occurredAt}
                  className="text-xs text-muted-foreground"
                >
                  {dateTimeFmt.format(new Date(n.occurredAt))}
                </time>
                <p className="mt-0.5 whitespace-pre-wrap text-sm leading-snug">
                  {n.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {notes.length > visible && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible((v) => v + 10)}
          >
            Charger plus
          </Button>
        </div>
      )}
    </SectionCard>
  );
}
