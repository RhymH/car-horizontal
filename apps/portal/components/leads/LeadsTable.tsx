"use client";

import {
  AlarmClock,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/RowActions";
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
import { formatPhone } from "@/lib/format";
import { leadSourceLabels } from "@/lib/schemas/lead";
import { LeadStageBadge } from "@/components/leads/LeadStageBadge";
import type { LeadListItem } from "@/lib/api/leads";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
});

const relativeFormatter = new Intl.RelativeTimeFormat("fr-FR", {
  numeric: "auto",
});

export function isOverdue(iso: string | null): boolean {
  return iso !== null && new Date(iso).getTime() < Date.now();
}

function relativeDays(iso: string): string {
  const days = Math.round(
    (new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000),
  );
  if (Math.abs(days) >= 60) {
    return relativeFormatter.format(Math.round(days / 30), "month");
  }
  return relativeFormatter.format(days, "day");
}

export interface LeadsTableProps {
  rows: LeadListItem[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onView: (row: LeadListItem) => void;
  onScheduleFollowUp: (row: LeadListItem) => void;
}

export function LeadsTable({
  rows,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onView,
  onScheduleFollowUp,
}: LeadsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Prospect</TableHead>
              <TableHead>Étape</TableHead>
              <TableHead>Prochaine relance</TableHead>
              <TableHead className="hidden md:table-cell">
                Dernière interaction
              </TableHead>
              <TableHead className="hidden lg:table-cell">Source</TableHead>
              <TableHead className="hidden xl:table-cell">Assigné à</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`s-${i}`}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Aucun prospect ne correspond à ces filtres.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const overdue = isOverdue(row.nextFollowUpAt);
                return (
                  <TableRow
                    key={row.customerId}
                    className="cursor-pointer"
                    onClick={() => onView(row)}
                  >
                    <TableCell>
                      <div className="font-medium">{row.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.phone
                          ? formatPhone(row.phone)
                          : (row.email ?? "Sans coordonnées")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <LeadStageBadge stage={row.stage} />
                    </TableCell>
                    <TableCell>
                      {row.nextFollowUpAt ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 tabular-nums",
                            overdue && "font-medium text-destructive",
                          )}
                        >
                          {overdue && <AlarmClock className="size-3.5" />}
                          {dateFormatter.format(new Date(row.nextFollowUpAt))}
                          <span
                            className={cn(
                              "text-xs",
                              overdue
                                ? "text-destructive/80"
                                : "text-muted-foreground",
                            )}
                          >
                            {relativeDays(row.nextFollowUpAt)}
                          </span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-xs text-primary underline-offset-2 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onScheduleFollowUp(row);
                          }}
                        >
                          À planifier
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {row.lastInteractionAt
                        ? relativeDays(row.lastInteractionAt)
                        : "Jamais"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {leadSourceLabels[row.source]}
                      {row.sourceDetail ? ` · ${row.sourceDetail}` : ""}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground">
                      {row.assignedToName ?? "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <RowActions
                        actions={[
                          {
                            label: "Voir la fiche",
                            icon: <Eye className="size-4" />,
                            onSelect: () => onView(row),
                          },
                          {
                            label: "Planifier une relance",
                            icon: <CalendarPlus className="size-4" />,
                            onSelect: () => onScheduleFollowUp(row),
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
            ? "0 prospect"
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
