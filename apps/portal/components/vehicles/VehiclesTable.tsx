"use client";

import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination } from "@/components/ui/Pagination";
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
import { saleStatusLabels } from "@/lib/api/sales";
import { SALE_STATUS_TONE, currencyFmt } from "@/components/sales/saleFormat";

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
  /** Affiche la colonne commerciale — seulement quand le module Vente est activé. */
  showSale?: boolean;
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
  showSale = false,
}: VehiclesTableProps) {
  const allChecked = rows.length > 0 && rows.every((r) => selection.has(r.id));
  const someChecked = !allChecked && rows.some((r) => selection.has(r.id));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const columnCount = showSale ? 10 : 9;

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
              {showSale && <TableHead className="text-right">Vente</TableHead>}
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
                  colSpan={columnCount}
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
                    {showSale && (
                      <TableCell className="text-right">
                        {row.saleStatus ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <StatusBadge tone={SALE_STATUS_TONE[row.saleStatus]}>
                              {saleStatusLabels[row.saleStatus]}
                            </StatusBadge>
                            {row.askingPrice != null && (
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {currencyFmt.format(row.askingPrice)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
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
      <Pagination
        page={page}
        pageCount={totalPages}
        onPageChange={onPageChange}
        total={total}
        pageSize={pageSize}
        itemLabel="véhicule"
        disabled={loading}
      />
    </div>
  );
}
