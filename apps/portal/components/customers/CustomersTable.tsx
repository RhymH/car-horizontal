"use client";

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
  customerStatusLabels,
  type CustomerStatus,
} from "@/lib/schemas/customer";
import type { CustomerListItem } from "@/lib/api/customers";

const STATUS_TONE: Record<
  CustomerStatus,
  "success" | "neutral" | "danger"
> = {
  Active: "success",
  Inactive: "neutral",
  Lost: "danger",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export interface CustomersTableProps {
  rows: CustomerListItem[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  selection: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  onPageChange: (page: number) => void;
  onView: (row: CustomerListItem) => void;
  onEdit: (row: CustomerListItem) => void;
  onDelete: (row: CustomerListItem) => void;
}

export function CustomersTable({
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
}: CustomersTableProps) {
  const allChecked = rows.length > 0 && rows.every((r) => selection.has(r.id));
  const someChecked =
    !allChecked && rows.some((r) => selection.has(r.id));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleAll = () => {
    const next = new Set(selection);
    if (allChecked) {
      rows.forEach((r) => next.delete(r.id));
    } else {
      rows.forEach((r) => next.add(r.id));
    }
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
              <TableHead>Nom</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Téléphone</TableHead>
              <TableHead className="hidden sm:table-cell text-center">
                Véhicules
              </TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="hidden xl:table-cell">Acquis le</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`s-${i}`}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Aucun résultat.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const checked = selection.has(row.id);
                return (
                  <TableRow
                    key={row.id}
                    className={cn("cursor-pointer", checked && "bg-accent/40")}
                    onClick={() => onView(row)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label={`Sélectionner ${row.fullName}`}
                        checked={checked}
                        onCheckedChange={() => toggleRow(row.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{row.fullName}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {row.email ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {row.phone ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center tabular-nums">
                      {row.vehicleCount}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={STATUS_TONE[row.status]}>
                        {customerStatusLabels[row.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground">
                      {dateFormatter.format(new Date(row.acquiredAt))}
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
            ? "0 client"
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
