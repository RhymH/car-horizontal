"use client";

import { Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowActions } from "@/components/ui/RowActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VehicleMaintenance } from "@/lib/api/vehicles";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("fr-FR");
const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const TYPE_LABEL: Record<string, string> = {
  OilChange: "Vidange",
  Tires: "Pneus",
  Brakes: "Freins",
  FullService: "Révision complète",
  TechnicalInspection: "Contrôle technique",
  Other: "Autre",
};

function typeLabel(value: string) {
  return TYPE_LABEL[value] ?? value;
}

export interface VehicleMaintenanceSectionProps {
  records: VehicleMaintenance[];
  onAdd: () => void;
  onEdit: (record: VehicleMaintenance) => void;
  onDelete: (record: VehicleMaintenance) => void;
}

export function VehicleMaintenanceSection({
  records,
  onAdd,
  onEdit,
  onDelete,
}: VehicleMaintenanceSectionProps) {
  return (
    <SectionCard
      title="Historique d'entretien"
      description={
        records.length === 0
          ? "Aucune intervention enregistrée"
          : `${records.length} intervention(s)`
      }
      actions={
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus />
          Nouvel entretien
        </Button>
      }
    >
      {records.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Aucun entretien enregistré"
          description="Ajoutez une intervention pour démarrer l'historique."
          action={
            <Button size="sm" onClick={onAdd}>
              Ajouter une intervention
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Description
                </TableHead>
                <TableHead className="text-right">Km</TableHead>
                <TableHead className="hidden sm:table-cell text-right">
                  Coût
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Mécanicien
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {dateFormatter.format(new Date(r.performedAt))}
                  </TableCell>
                  <TableCell className="font-medium">
                    {typeLabel(r.type)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {r.description || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {numberFormatter.format(r.mileageAtService)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right tabular-nums text-muted-foreground">
                    {r.cost != null ? currencyFormatter.format(r.cost) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {r.mechanicName || "—"}
                  </TableCell>
                  <TableCell>
                    <RowActions
                      actions={[
                        {
                          label: "Modifier",
                          icon: <Pencil className="size-4" />,
                          onSelect: () => onEdit(r),
                        },
                        {
                          label: "Supprimer",
                          icon: <Trash2 className="size-4" />,
                          onSelect: () => onDelete(r),
                          variant: "destructive",
                          separatorBefore: true,
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}
