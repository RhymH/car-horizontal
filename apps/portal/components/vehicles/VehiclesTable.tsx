"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/RowActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  engineTypeLabels,
  type EngineTypeApi,
  type VehicleListItem,
} from "@/lib/api/vehicles";

const ENGINE_TONE: Record<EngineTypeApi, "success" | "neutral" | "info" | "warning"> = {
  Gasoline: "neutral",
  Diesel: "neutral",
  Hybrid: "info",
  Electric: "success",
  LPG: "warning",
};

const numberFormatter = new Intl.NumberFormat("fr-FR");

export interface VehiclesTableProps {
  rows: VehicleListItem[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  selection: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  onPageChange: (page: number) => void;
  onView: (row: VehicleListItem) => void;
  onEdit: (row: VehicleListItem) => void;
  onDelete: (row: VehicleListItem) => void;
}

export function VehiclesTable({
  rows,
  loading,
  page,
  pageSize,
  total,
  selection,
  onSelectionChange,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: VehiclesTableProps) {
  const allChecked = rows.length > 0 && rows.every((r) => selection.has(r.id));
  const someChecked = !allChecked && rows.some((r) => selection.has(r.id));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleAll = () => {
    const next = new Set(selection);
    if (allChecked) rows.forEach((r) => next.delete(r.id));
    else rows.forEach((r) => next.add(r.id));
    onSelectionChange(next);
  };

  const toggleRow = (id: string) => {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Tout sélectionner"
                  checked={allChecked}
                  indeterminate={someChecked}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="w-16">Photo</TableHead>
              <TableHead>Marque / Modèle</TableHead>
              <TableHead className="hidden sm:table-cell text-center">
                Année
              </TableHead>
              <TableHead>Immat.</TableHead>
              <TableHead className="hidden md:table-cell">Client</TableHead>
              <TableHead className="hidden lg:table-cell text-right">
                Km
              </TableHead>
              <TableHead className="hidden xl:table-cell">Énergie</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`s-${i}`}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Aucun résultat.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const checked = selection.has(row.id);
                const initials = `${row.make.charAt(0)}${row.model.charAt(0)}`.toUpperCase();
                return (
                  <TableRow
                    key={row.id}
                    className={cn("cursor-pointer", checked && "bg-accent/40")}
                    onClick={() => onView(row)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label={`Sélectionner ${row.licensePlate}`}
                        checked={checked}
                        onCheckedChange={() => toggleRow(row.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex size-10 items-center justify-center rounded-md border border-border bg-muted text-xs font-semibold text-muted-foreground">
                        {initials}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.make} {row.model}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center tabular-nums text-muted-foreground">
                      {row.year ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm uppercase">
                      {row.licensePlate ?? (
                        <span className="font-sans text-xs italic normal-case text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className="hidden md:table-cell text-muted-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/clients/${row.customerId}`}
                        className="hover:text-foreground hover:underline"
                      >
                        {row.customerFullName || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right tabular-nums text-muted-foreground">
                      {numberFormatter.format(row.currentMileage)} km
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {row.engineType ? (
                        <StatusBadge tone={ENGINE_TONE[row.engineType]}>
                          {engineTypeLabels[row.engineType]}
                        </StatusBadge>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <RowActions
                        actions={[
                          {
                            label: "Voir",
                            icon: <Eye className="size-4" />,
                            onSelect: () => onView(row),
                          },
                          {
                            label: "Modifier",
                            icon: <Pencil className="size-4" />,
                            onSelect: () => onEdit(row),
                          },
                          {
                            label: "Supprimer",
                            icon: <Trash2 className="size-4" />,
                            onSelect: () => onDelete(row),
                            variant: "destructive",
                            separatorBefore: true,
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          {total === 0
            ? "0 véhicule"
            : `${(page - 1) * pageSize + 1}–${Math.min(
                page * pageSize,
                total,
              )} sur ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            aria-label="Page précédente"
          >
            <ChevronLeft />
          </Button>
          <span className="px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            aria-label="Page suivante"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
