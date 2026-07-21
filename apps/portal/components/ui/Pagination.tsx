"use client";

import { type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  /** Page courante (1-based). */
  page: number;
  /** Nombre total de pages (≥ 1). */
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Nombre total d'éléments — active le résumé « 1–25 sur 100 ». */
  total?: number;
  /** Taille de page — nécessaire au calcul du résumé. */
  pageSize?: number;
  /** Nom singulier de l'élément listé, pour le cas « 0 client ». */
  itemLabel?: string;
  /** Résumé personnalisé qui remplace le résumé calculé. */
  summary?: ReactNode;
  /** Masque le résumé textuel. */
  hideSummary?: boolean;
  /** Masque les boutons « première / dernière page ». */
  hideEdges?: boolean;
  /** Pages affichées de part et d'autre de la page courante (def. 1). */
  siblingCount?: number;
  /** Désactive tous les contrôles (chargement en cours). */
  disabled?: boolean;
  className?: string;
}

const ELLIPSIS = "ellipsis" as const;
type PageItem = number | typeof ELLIPSIS;

function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
}

/** Fenêtre de pages avec ellipses : 1 … 4 5 [6] 7 8 … 20. */
function pageItems(
  page: number,
  pageCount: number,
  siblingCount: number,
): PageItem[] {
  const totalSlots = siblingCount * 2 + 5; // première + dernière + courante + 2 ellipses
  if (pageCount <= totalSlots) return range(1, pageCount);

  const left = Math.max(page - siblingCount, 1);
  const right = Math.min(page + siblingCount, pageCount);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < pageCount - 1;
  const edgeCount = 3 + siblingCount * 2;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, edgeCount), ELLIPSIS, pageCount];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, ELLIPSIS, ...range(pageCount - edgeCount + 1, pageCount)];
  }
  return [1, ELLIPSIS, ...range(left, right), ELLIPSIS, pageCount];
}

function defaultSummary(
  total: number,
  page: number,
  pageSize: number,
  itemLabel: string,
): string {
  if (total === 0) return `0 ${itemLabel}`;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return `${start}–${end} sur ${total}`;
}

/**
 * Pagination complète et accessible : résumé de plage, première / précédente,
 * numéros de page avec ellipses, suivante / dernière. Utilisable aussi bien
 * côté serveur (via `page`/`total`) que client (via un tableau paginé).
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
  itemLabel = "élément",
  summary,
  hideSummary = false,
  hideEdges = false,
  siblingCount = 1,
  disabled = false,
  className,
}: PaginationProps) {
  const safeCount = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), safeCount);
  const atFirst = current <= 1;
  const atLast = current >= safeCount;

  const summaryNode =
    summary ??
    (total !== undefined && pageSize
      ? defaultSummary(total, current, pageSize, itemLabel)
      : `Page ${current} sur ${safeCount}`);

  const items = pageItems(current, safeCount, siblingCount);

  const goto = (target: number) => {
    const next = Math.min(Math.max(1, target), safeCount);
    if (next !== current) onPageChange(next);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {!hideSummary && <span>{summaryNode}</span>}
      <nav
        aria-label="Pagination"
        className="flex items-center gap-1 sm:ml-auto"
      >
        {!hideEdges && (
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            onClick={() => goto(1)}
            disabled={disabled || atFirst}
            aria-label="Première page"
          >
            <ChevronsLeft />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => goto(current - 1)}
          disabled={disabled || atFirst}
          aria-label="Page précédente"
        >
          <ChevronLeft />
        </Button>
        {items.map((item, i) =>
          item === ELLIPSIS ? (
            <span
              key={`ellipsis-${i}`}
              aria-hidden
              className="hidden size-8 items-center justify-center text-muted-foreground sm:inline-flex"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === current ? "default" : "outline"}
              size="icon-sm"
              className="hidden w-auto min-w-8 px-2 tabular-nums sm:inline-flex"
              onClick={() => goto(item)}
              disabled={disabled}
              aria-label={`Page ${item}`}
              aria-current={item === current ? "page" : undefined}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => goto(current + 1)}
          disabled={disabled || atLast}
          aria-label="Page suivante"
        >
          <ChevronRight />
        </Button>
        {!hideEdges && (
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            onClick={() => goto(safeCount)}
            disabled={disabled || atLast}
            aria-label="Dernière page"
          >
            <ChevronsRight />
          </Button>
        )}
      </nav>
    </div>
  );
}
