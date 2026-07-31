"use client";

import {
  BadgeEuro,
  CalendarClock,
  MessageSquare,
  Pencil,
  TrendingDown,
} from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  saleStatusLabels,
  saleStatuses,
  type SaleDossier,
  type SaleStatusApi,
} from "@/lib/api/sales";
import { SALE_STATUS_TONE, money, numberFmt, shortDate } from "@/components/sales/saleFormat";
import { cn } from "@/lib/utils";

/**
 * Bandeau commercial du dossier : statut, prix, marge et rythme de vente. La marge
 * et le prix plancher sont des données internes — ils ne sortent jamais dans une
 * annonce, d'où le rappel visuel « interne ».
 */
export function SaleSummaryCard({
  dossier,
  onChangeStatus,
  onEditPrice,
  onEditDetails,
  statusPending,
}: {
  dossier: SaleDossier;
  onChangeStatus: (status: SaleStatusApi) => void;
  onEditPrice: () => void;
  onEditDetails: () => void;
  statusPending: boolean;
}) {
  const listing = dossier.listing;
  const metrics = dossier.metrics;
  const status = (listing?.status ?? "Draft") as SaleStatusApi;
  const isSold = status === "Sold";
  const margin = isSold ? metrics.realizedMargin : metrics.estimatedMargin;

  return (
    <SectionCard
      title="Dossier de vente"
      description={
        listing?.listedAt
          ? `Mis en vente le ${shortDate(listing.listedAt)}`
          : "Pas encore publié"
      }
      actions={
        <div className="flex items-center gap-2">
          <Select
            items={saleStatusLabels}
            value={status}
            onValueChange={(v) => onChangeStatus(v as SaleStatusApi)}
            disabled={statusPending}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {saleStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {saleStatusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={onEditDetails}>
            <Pencil />
            Modifier
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {isSold ? "Prix de vente" : "Prix affiché"}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-semibold tabular-nums">
                {money(isSold ? listing?.soldPrice : listing?.askingPrice)}
              </span>
              <StatusBadge tone={SALE_STATUS_TONE[status]}>
                {saleStatusLabels[status]}
              </StatusBadge>
              {listing?.isPriceNegotiable && !isSold && (
                <span className="text-xs text-muted-foreground">négociable</span>
              )}
            </div>
            {metrics.totalPriceDrop != null && metrics.totalPriceDrop > 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <TrendingDown className="size-3.5" />
                {money(metrics.totalPriceDrop)} de baisse depuis la mise en vente
              </p>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={onEditPrice}>
            <BadgeEuro />
            Changer le prix
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            label="Jours en stock"
            value={
              metrics.daysInStock == null
                ? "—"
                : numberFmt.format(metrics.daysInStock)
            }
            icon={<CalendarClock className="size-3.5" />}
            tone={
              metrics.daysInStock != null && metrics.daysInStock > 90 && !isSold
                ? "warn"
                : undefined
            }
          />
          <Metric
            label={isSold ? "Marge réalisée" : "Marge estimée"}
            value={money(margin)}
            internal
            tone={margin != null && margin < 0 ? "bad" : undefined}
          />
          <Metric label="Prix de revient" value={money(metrics.totalCost)} internal />
          <Metric
            label="Contacts en cours"
            value={numberFmt.format(metrics.openInquiryCount)}
            icon={<MessageSquare className="size-3.5" />}
          />
        </div>

        {(listing?.floorPrice != null || metrics.bestOffer != null) && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {listing?.floorPrice != null && (
              <span>
                Prix plancher <strong className="text-foreground">{money(listing.floorPrice)}</strong>{" "}
                (interne)
              </span>
            )}
            {metrics.bestOffer != null && (
              <span>
                Meilleure offre reçue{" "}
                <strong className="text-foreground">{money(metrics.bestOffer)}</strong>
              </span>
            )}
            {metrics.onlinePostCount > 0 && (
              <span>
                {metrics.onlinePostCount} annonce{metrics.onlinePostCount > 1 ? "s" : ""} en
                ligne
              </span>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function Metric({
  label,
  value,
  icon,
  internal,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  internal?: boolean;
  tone?: "warn" | "bad";
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
        {internal && <span className="text-[10px] uppercase opacity-70">interne</span>}
      </p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums",
          tone === "warn" && "text-amber-600 dark:text-amber-400",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}
