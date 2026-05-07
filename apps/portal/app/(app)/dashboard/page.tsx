"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BellRing,
  Car,
  RefreshCw,
  Repeat,
  UserCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/session-context";
import { dashboardApi } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/query/keys";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { UpcomingRemindersWidget } from "@/components/dashboard/UpcomingRemindersWidget";
import { OverdueTimelineWidget } from "@/components/dashboard/OverdueTimelineWidget";
import { CriticalThisWeekWidget } from "@/components/dashboard/CriticalThisWeekWidget";
import { RemindersChart } from "@/components/dashboard/RemindersChart";
import { LoyaltyChart } from "@/components/dashboard/LoyaltyChart";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { MentalLoadHero } from "@/components/dashboard/MentalLoadHero";

const todayFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function firstName(fullName: string | undefined | null): string | null {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  const space = trimmed.indexOf(" ");
  return space === -1 ? trimmed : trimmed.slice(0, space);
}

export default function DashboardPage() {
  const { me } = useSession();
  const greeting = firstName(me?.fullName) ?? "bienvenue";
  const today = todayFmt.format(new Date());

  const overview = useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: ({ signal }) => dashboardApi.overview(signal),
    refetchOnWindowFocus: false,
  });

  const data = overview.data;
  const loading = overview.isLoading;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title={`Bonjour ${greeting} 👋`}
        description={today.charAt(0).toUpperCase() + today.slice(1)}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => overview.refetch()}
              disabled={overview.isFetching}
              title="Rafraîchir"
            >
              <RefreshCw
                className={overview.isFetching ? "animate-spin" : ""}
              />
            </Button>
            <QuickActions />
          </div>
        }
      />

      {data && <MentalLoadHero data={data.mentalLoadAvoided} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Clients actifs"
          value={loading ? "—" : (data?.kpis.activeCustomers ?? 0)}
          href="/clients"
          tone="default"
          trendPct={data?.kpis.activeCustomersTrendPct ?? null}
        />
        <KpiCard
          icon={UserCheck}
          label="Clients à relancer"
          hint=">180 jours sans contact"
          value={loading ? "—" : (data?.kpis.customersAtRisk ?? 0)}
          href="/clients?status=at-risk"
          tone="warning"
        />
        <KpiCard
          icon={Car}
          label="Véhicules suivis"
          value={loading ? "—" : (data?.kpis.trackedVehicles ?? 0)}
          href="/vehicles"
          tone="default"
        />
        <KpiCard
          icon={BellRing}
          label="Rappels envoyés (30j)"
          value={loading ? "—" : (data?.kpis.remindersSentLast30Days ?? 0)}
          href="/reminders?status=Sent"
          tone="success"
          trendPct={data?.kpis.remindersSentTrendPct ?? null}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          icon={AlertTriangle}
          label="Rappels en attente"
          value={loading ? "—" : (data?.kpis.pendingReminders ?? 0)}
          href="/reminders?status=Scheduled"
          tone="warning"
        />
        <KpiCard
          icon={Repeat}
          label="Taux de retour atelier"
          hint="12 derniers mois"
          value={
            loading ? "—" : `${(data?.kpis.workshopReturnRate ?? 0).toFixed(1)}%`
          }
          href="/loyalty"
          tone="success"
        />
        <CriticalThisWeekWidget
          items={data?.criticalThisWeek ?? []}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingRemindersWidget
          items={data?.upcomingReminders ?? []}
          loading={loading}
        />
        <OverdueTimelineWidget
          items={data?.overdueTimeline ?? []}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RemindersChart
          series={data?.remindersChartSeries ?? []}
          loading={loading}
        />
        <LoyaltyChart series={data?.loyaltyTrend ?? []} loading={loading} />
      </div>

      <RecentActivityWidget
        items={data?.recentInteractions ?? []}
        loading={loading}
      />
    </div>
  );
}
