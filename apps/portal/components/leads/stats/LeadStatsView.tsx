"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlarmClock,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Minus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { leadsApi, type LeadSourceApi } from "@/lib/api/leads";
import { queryKeys } from "@/lib/query/keys";
import { leadSourceLabels } from "@/lib/schemas/lead";
import { percentFr } from "@/components/leads/stats/chartTheme";
import {
  BreakdownChart,
  FunnelChart,
  LostReasonsChart,
  TrendChart,
} from "@/components/leads/stats/charts";

const ALL = "All";

type PresetKey = "7d" | "30d" | "90d" | "12m" | "custom";

const PRESETS: { key: PresetKey; label: string; days?: number }[] = [
  { key: "7d", label: "7 jours", days: 7 },
  { key: "30d", label: "30 jours", days: 30 },
  { key: "90d", label: "90 jours", days: 90 },
  { key: "12m", label: "12 mois", days: 365 },
  { key: "custom", label: "Personnalisé" },
];

const numberFr = new Intl.NumberFormat("fr-FR");

export function LeadStatsView() {
  const [preset, setPreset] = useState<PresetKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [source, setSource] = useState<string>(ALL);
  const [tag, setTag] = useState<string>(ALL);
  const [assignee, setAssignee] = useState<string>(ALL);

  const range = useMemo(() => {
    if (preset === "custom") {
      if (!customFrom) return null;
      const from = new Date(`${customFrom}T00:00:00`);
      const to = customTo ? new Date(`${customTo}T23:59:59`) : new Date();
      return { from: from.toISOString(), to: to.toISOString() };
    }
    const days = PRESETS.find((p) => p.key === preset)?.days ?? 30;
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 3600 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [preset, customFrom, customTo]);

  const params = useMemo(
    () => ({
      from: range?.from,
      to: range?.to,
      source: source === ALL ? undefined : (source as LeadSourceApi),
      tag: tag === ALL ? undefined : tag,
      assignedToUserId: assignee === ALL ? undefined : assignee,
    }),
    [range, source, tag, assignee],
  );

  const stats = useQuery({
    queryKey: queryKeys.leads.stats(params),
    queryFn: ({ signal }) => leadsApi.stats(params, signal),
    placeholderData: keepPreviousData,
    enabled: range !== null,
  });

  const team = useQuery({
    queryKey: queryKeys.leads.team(),
    queryFn: ({ signal }) => leadsApi.team(signal),
    staleTime: 5 * 60 * 1000,
  });

  const data = stats.data;
  const k = data?.kpis;

  const reset = () => {
    setPreset("30d");
    setCustomFrom("");
    setCustomTo("");
    setSource(ALL);
    setTag(ALL);
    setAssignee(ALL);
  };

  const noData =
    data !== undefined &&
    k !== undefined &&
    k.newLeads === 0 &&
    k.won === 0 &&
    k.lost === 0 &&
    k.openPipeline === 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <Link
          href="/clients"
          className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Retour aux clients
        </Link>
      </div>
      <PageHeader
        title="Statistiques prospects"
        description="Conversion, performance des campagnes et activité commerciale — comparées à la période précédente."
      />

      {/* Filtres : une seule rangée au-dessus des graphiques */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <Tabs value={preset} onValueChange={(v) => v && setPreset(v as PresetKey)}>
          <TabsList size="sm">
            {PRESETS.map((p) => (
              <TabsTrigger key={p.key} value={p.key}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 w-36 text-sm"
              aria-label="Du"
            />
            <span className="text-sm text-muted-foreground">→</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 w-36 text-sm"
              aria-label="Au"
            />
          </div>
        )}
        <Select
          items={{ [ALL]: "Toutes les sources", ...leadSourceLabels }}
          value={source}
          onValueChange={(v) => setSource(v ?? ALL)}
        >
          <SelectTrigger size="sm" className="w-full lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les sources</SelectItem>
            {(Object.keys(leadSourceLabels) as LeadSourceApi[]).map((s) => (
              <SelectItem key={s} value={s}>
                {leadSourceLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={{
            [ALL]: "Toutes les campagnes",
            ...Object.fromEntries((data?.availableTags ?? []).map((t) => [t, t])),
          }}
          value={tag}
          onValueChange={(v) => setTag(v ?? ALL)}
        >
          <SelectTrigger size="sm" className="w-full lg:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les campagnes</SelectItem>
            {(data?.availableTags ?? []).map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={{
            [ALL]: "Toute l'équipe",
            ...Object.fromEntries(
              (team.data ?? []).map((m) => [m.userId, m.fullName]),
            ),
          }}
          value={assignee}
          onValueChange={(v) => setAssignee(v ?? ALL)}
        >
          <SelectTrigger size="sm" className="w-full lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toute l&apos;équipe</SelectItem>
            {(team.data ?? []).map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={reset} className="lg:ml-auto">
          Réinitialiser
        </Button>
      </div>

      {stats.isLoading || !data || !k ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : noData ? (
        <EmptyState
          icon={BarChart3}
          title="Pas encore de données sur cette période"
          description="Élargissez la période ou ajustez les filtres. Les statistiques se remplissent dès que des prospects entrent dans le pipeline."
        />
      ) : (
        <>
          {/* KPI */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <KpiTile
              label="Nouveaux prospects"
              value={numberFr.format(k.newLeads)}
              current={k.newLeads}
              previous={k.newLeadsPrev}
            />
            <KpiTile
              label="Convertis en clients"
              value={numberFr.format(k.won)}
              current={k.won}
              previous={k.wonPrev}
            />
            <KpiTile
              label="Taux de conversion"
              hint="Gagnés / dossiers clôturés sur la période"
              value={percentFr(k.conversionRate)}
              current={k.conversionRate}
              previous={k.conversionRatePrev}
              deltaAsPoints
            />
            <KpiTile
              label="Temps moyen de conversion"
              value={
                k.avgDaysToConvert === null
                  ? "—"
                  : `${k.avgDaysToConvert.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j`
              }
              current={k.avgDaysToConvert}
              previous={k.avgDaysToConvertPrev}
              lowerIsBetter
            />
            <KpiTile
              label="Interactions"
              hint={`${numberFr.format(k.followUpsCompleted)} relance(s) effectuée(s)`}
              value={numberFr.format(k.interactions)}
              current={k.interactions}
              previous={k.interactionsPrev}
            />
            <div
              className={cn(
                "flex flex-col justify-between gap-1 rounded-xl border bg-card p-4 shadow-sm",
                k.overdueFollowUps > 0 ? "border-destructive/40" : "border-border",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pipeline en cours
              </p>
              <p className="text-2xl font-semibold">
                {numberFr.format(k.openPipeline)}
              </p>
              <p
                className={cn(
                  "flex items-center gap-1 text-xs",
                  k.overdueFollowUps > 0
                    ? "font-medium text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {k.overdueFollowUps > 0 && <AlarmClock className="size-3.5" />}
                {k.overdueFollowUps > 0
                  ? `${k.overdueFollowUps} relance(s) en retard`
                  : "Aucune relance en retard"}
              </p>
            </div>
          </div>

          {/* Tendance */}
          <SectionCard
            title="Évolution dans le temps"
            description={
              data.granularity === "day"
                ? "Par jour"
                : data.granularity === "week"
                  ? "Par semaine"
                  : "Par mois"
            }
          >
            <TrendChart timeline={data.timeline} granularity={data.granularity} />
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Funnel de la cohorte"
              description="Prospects arrivés sur la période : jusqu'où sont-ils allés ? (perdus exclus)"
            >
              <FunnelChart funnel={data.funnel} />
            </SectionCard>
            <SectionCard
              title="Performance des campagnes"
              description="Par tag — issue actuelle des prospects arrivés sur la période, % = taux de conversion"
            >
              <BreakdownChart
                rows={data.byTag}
                emptyLabel="Aucun prospect tagué sur la période. Ajoutez un tag de campagne à l'import ou sur les fiches."
              />
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Sources d'acquisition"
              description="D'où viennent les prospects de la période, et ce qu'ils deviennent"
            >
              <BreakdownChart
                rows={data.bySource}
                emptyLabel="Aucun prospect sur la période."
              />
            </SectionCard>
            <SectionCard
              title="Raisons de perte"
              description="Pourquoi les prospects perdus sur la période sont partis"
            >
              <LostReasonsChart reasons={data.lostReasons} />
            </SectionCard>
          </div>

          {/* Vendeurs */}
          <SectionCard
            title="Activité de l'équipe"
            description="Conversions et activité sur la période ; relances en retard à date"
          >
            {data.byUser.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune activité assignée sur la période. Assignez les prospects
                pour suivre qui vend quoi.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Vendeur</TableHead>
                      <TableHead className="text-right">Convertis</TableHead>
                      <TableHead className="text-right">En cours</TableHead>
                      <TableHead className="text-right">Interactions</TableHead>
                      <TableHead className="text-right">
                        Relances en retard
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byUser.map((u) => (
                      <TableRow key={u.userId}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {u.won}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {u.open}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {u.interactions}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            u.overdueFollowUps > 0 &&
                              "font-medium text-destructive",
                          )}
                        >
                          {u.overdueFollowUps}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  hint,
  current,
  previous,
  lowerIsBetter = false,
  deltaAsPoints = false,
}: {
  label: string;
  value: string;
  hint?: string;
  current: number | null;
  previous: number | null;
  lowerIsBetter?: boolean;
  deltaAsPoints?: boolean;
}) {
  let delta: string | null = null;
  let up = true;
  let good = true;

  if (current !== null && previous !== null) {
    if (deltaAsPoints) {
      const pts = (current - previous) * 100;
      if (Math.abs(pts) >= 0.5) {
        delta = `${pts > 0 ? "+" : ""}${pts.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} pt`;
        up = pts > 0;
        good = lowerIsBetter ? !up : up;
      }
    } else if (previous !== 0) {
      const pct = ((current - previous) / previous) * 100;
      if (Math.abs(pct) >= 1) {
        delta = `${pct > 0 ? "+" : ""}${pct.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %`;
        up = pct > 0;
        good = lowerIsBetter ? !up : up;
      }
    } else if (current > 0) {
      delta = "nouveau";
      up = true;
      good = !lowerIsBetter;
    }
  }

  return (
    <div className="flex flex-col justify-between gap-1 rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        {delta === null ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Minus className="size-3.5" />
            stable vs période précédente
          </span>
        ) : (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium whitespace-nowrap",
                good
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-destructive",
              )}
            >
              {up ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {delta}
            </span>
            <span className="whitespace-nowrap">vs période préc.</span>
          </>
        )}
        {hint && (
          <span className="ml-auto hidden min-w-0 truncate text-right xl:inline" title={hint}>
            {hint}
          </span>
        )}
      </p>
    </div>
  );
}
