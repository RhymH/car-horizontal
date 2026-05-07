"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Heart,
  Megaphone,
  Percent,
  RefreshCw,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CohortHeatmap } from "@/components/loyalty/CohortHeatmap";
import { RetentionTrendChart } from "@/components/loyalty/RetentionTrendChart";
import { AtRiskList } from "@/components/loyalty/AtRiskList";
import { LostCustomersList } from "@/components/loyalty/LostCustomersList";
import { BulkRelaunchDialog } from "@/components/loyalty/BulkRelaunchDialog";
import { loyaltyApi, type LoyaltyCustomer } from "@/lib/api/loyalty";
import { queryKeys } from "@/lib/query/keys";

const AT_RISK_LIMIT = 50;
const LOST_LIMIT = 50;

export default function LoyaltyPage() {
  const overview = useQuery({
    queryKey: queryKeys.loyalty.overview(),
    queryFn: ({ signal }) => loyaltyApi.overview(signal),
    refetchOnWindowFocus: false,
  });
  const cohorts = useQuery({
    queryKey: queryKeys.loyalty.cohorts(),
    queryFn: ({ signal }) => loyaltyApi.cohorts(signal),
    refetchOnWindowFocus: false,
  });
  const atRisk = useQuery({
    queryKey: queryKeys.loyalty.atRisk(AT_RISK_LIMIT),
    queryFn: ({ signal }) => loyaltyApi.atRisk(AT_RISK_LIMIT, signal),
    refetchOnWindowFocus: false,
  });
  const lost = useQuery({
    queryKey: queryKeys.loyalty.lost(LOST_LIMIT),
    queryFn: ({ signal }) => loyaltyApi.lost(LOST_LIMIT, signal),
    refetchOnWindowFocus: false,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCandidates, setDialogCandidates] = useState<LoyaltyCustomer[]>(
    [],
  );
  const [dialogPreselect, setDialogPreselect] = useState<string[] | undefined>();

  const openBulk = () => {
    setDialogCandidates(atRisk.data?.items ?? []);
    setDialogPreselect(undefined);
    setDialogOpen(true);
  };

  const openSingle = (customer: LoyaltyCustomer, source: "at-risk" | "lost") => {
    const pool = source === "at-risk" ? atRisk.data?.items : lost.data?.items;
    setDialogCandidates(pool ?? [customer]);
    setDialogPreselect([customer.id]);
    setDialogOpen(true);
  };

  const refetchAll = () => {
    void overview.refetch();
    void cohorts.refetch();
    void atRisk.refetch();
    void lost.refetch();
  };

  const kpis = overview.data?.kpis;
  const trend = overview.data?.retentionTrend ?? [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Fidélisation"
        description="Suivez les clients récurrents et relancez ceux qui s'éloignent."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetchAll}
              disabled={overview.isFetching}
              title="Rafraîchir"
            >
              <RefreshCw className={overview.isFetching ? "animate-spin" : ""} />
            </Button>
            <Button onClick={openBulk} disabled={(atRisk.data?.items.length ?? 0) === 0}>
              <Megaphone className="size-4" />
              Lancer une campagne de relance
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Percent}
          label="Rétention 12 mois"
          hint="Clients existants 12m plus tôt revenus"
          value={
            overview.isLoading || !kpis
              ? "—"
              : `${kpis.retention12mPct.toFixed(1)}%`
          }
          tone="success"
        />
        <KpiCard
          icon={UserPlus}
          label="Clients revenus"
          hint="Sur 12 mois"
          value={overview.isLoading || !kpis ? "—" : kpis.returnedLast12Months}
          tone="default"
        />
        <KpiCard
          icon={UserMinus}
          label="Clients perdus"
          hint=">18 mois sans contact"
          value={overview.isLoading || !kpis ? "—" : kpis.lostCustomers}
          tone="danger"
        />
        <KpiCard
          icon={Clock}
          label="Fréquence moyenne"
          hint="Intervalle entre interactions"
          value={
            overview.isLoading || !kpis
              ? "—"
              : `${Math.round(kpis.averageReturnIntervalDays)} j`
          }
          tone="default"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RetentionTrendChart series={trend} loading={overview.isLoading} />
        <CohortHeatmap data={cohorts.data} loading={cohorts.isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AtRiskList
          customers={atRisk.data?.items ?? []}
          loading={atRisk.isLoading}
          onRelaunch={(c) => openSingle(c, "at-risk")}
          onBulk={openBulk}
        />
        <LostCustomersList
          customers={lost.data?.items ?? []}
          loading={lost.isLoading}
          onReactivate={(c) => openSingle(c, "lost")}
        />
      </div>

      <BulkRelaunchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        candidates={dialogCandidates}
        defaultSelectedIds={dialogPreselect}
      />

      <p className="text-xs text-muted-foreground">
        <Heart className="mr-1 inline size-3" />
        Les indicateurs sont recalculés chaque semaine. Les listes sont
        rafraîchies à chaque visite.
      </p>
    </div>
  );
}
