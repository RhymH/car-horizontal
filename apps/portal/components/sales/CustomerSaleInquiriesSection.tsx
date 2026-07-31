"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Car, Loader2 } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { useCapability } from "@/lib/hooks/useCapabilities";
import { CAPABILITY_SALES } from "@/lib/api/capabilities";
import {
  inquiryChannelLabels,
  inquiryStatusLabels,
  salesApi,
  saleStatusLabels,
  type InquiryStatusApi,
} from "@/lib/api/sales";
import { queryKeys } from "@/lib/query/keys";
import { SALE_STATUS_TONE, money, shortDate } from "@/components/sales/saleFormat";

const STATUS_TONE: Record<InquiryStatusApi, StatusTone> = {
  New: "info",
  Contacted: "neutral",
  TestDriveScheduled: "warning",
  OfferMade: "warning",
  Negotiating: "warning",
  Won: "success",
  Lost: "danger",
};

/**
 * Véhicules sur lesquels ce client s'est positionné comme acheteur. Contrepartie
 * côté client de la section « contacts acheteurs » du dossier de vente : sans elle,
 * un intérêt d'achat ne serait visible que depuis le véhicule.
 *
 * La section disparaît quand il n'y a aucun contact — la majorité des clients de
 * l'atelier n'achètent pas de véhicule, inutile de leur ajouter une carte vide.
 */
export function CustomerSaleInquiriesSection({ customerId }: { customerId: string }) {
  const { enabled } = useCapability(CAPABILITY_SALES);

  const query = useQuery({
    queryKey: queryKeys.sales.customerInquiries(customerId),
    queryFn: ({ signal }) => salesApi.listCustomerInquiries(customerId, signal),
    enabled,
  });

  if (!enabled) return null;

  if (query.isLoading) {
    return (
      <SectionCard title="Intérêts d'achat">
        <div className="flex h-16 items-center justify-center text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      </SectionCard>
    );
  }

  const items = query.data?.items ?? [];
  if (items.length === 0) return null;

  const openCount = query.data?.openCount ?? 0;

  return (
    <SectionCard
      title="Intérêts d'achat"
      description={
        openCount > 0
          ? `${openCount} en cours sur ${items.length} véhicule${items.length > 1 ? "s" : ""}`
          : `${items.length} véhicule${items.length > 1 ? "s" : ""} — aucun en cours`
      }
    >
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/vehicles/${item.vehicleId}`}
                  className="inline-flex items-center gap-1.5 font-medium hover:underline"
                >
                  <Car className="size-3.5 text-muted-foreground" />
                  {item.vehicleLabel || "Véhicule"}
                </Link>
                {item.licensePlate && (
                  <span className="font-mono text-xs uppercase text-muted-foreground">
                    {item.licensePlate}
                  </span>
                )}
                <StatusBadge tone={SALE_STATUS_TONE[item.vehicleSaleStatus]}>
                  {saleStatusLabels[item.vehicleSaleStatus]}
                </StatusBadge>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {inquiryChannelLabels[item.channel]} · {shortDate(item.receivedAt)}
                </span>
                {item.askingPrice != null && (
                  <span>Prix affiché {money(item.askingPrice)}</span>
                )}
                {item.testDriveAt && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="size-3.5" />
                    Essai le {shortDate(item.testDriveAt)}
                  </span>
                )}
                {item.nextFollowUpAt && (
                  <span>Relance le {shortDate(item.nextFollowUpAt)}</span>
                )}
              </div>

              {item.lostReason && (
                <p className="text-xs text-destructive">Perdu : {item.lostReason}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge tone={STATUS_TONE[item.status]}>
                {inquiryStatusLabels[item.status]}
              </StatusBadge>
              {item.offerAmount != null && (
                <span className="text-sm font-semibold tabular-nums">
                  {money(item.offerAmount)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
