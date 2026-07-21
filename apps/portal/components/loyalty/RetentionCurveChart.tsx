"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";
import { SectionCard } from "@/components/ui/SectionCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loyaltyApi } from "@/lib/api/loyalty";
import { queryKeys } from "@/lib/query/keys";
import { CohortRetentionGrid } from "@/components/loyalty/CohortRetentionGrid";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse rounded bg-muted/40" />,
});

type PresetKey = "3m" | "12m" | "24m";
type ViewKey = "stacked" | "cohort";

const PRESETS: { key: PresetKey; label: string; months: number }[] = [
  { key: "3m", label: "3 mois", months: 3 },
  { key: "12m", label: "12 mois", months: 12 },
  { key: "24m", label: "24 mois", months: 24 },
];

// Ink & chrome (light — the portal has no dark ThemeProvider mounted yet).
const INK = "#0b0b0b";
const MUTED = "#898781";
const GRID = "#e1e0d9";
const AXIS = "#c3c2b7";
const SURFACE = "#ffffff";
const EARLIER = "#c8ccc9"; // neutral base band

// Blue sequential ramp (palette 700 → 250): oldest cohort deep, newest light.
// A single-hue ramp keeps the stack reading as an ordered gradient, not a rainbow.
const RAMP = ["#0d366b", "#184f95", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4"];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}
/** Sample the ramp into n evenly-spaced colors (oldest → newest). */
function cohortColors(n: number): string[] {
  if (n <= 0) return [];
  if (n === 1) return [RAMP[Math.floor(RAMP.length / 2)]];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = (i / (n - 1)) * (RAMP.length - 1);
    const lo = Math.floor(p);
    const hi = Math.min(lo + 1, RAMP.length - 1);
    const f = p - lo;
    const [r1, g1, b1] = hexToRgb(RAMP[lo]);
    const [r2, g2, b2] = hexToRgb(RAMP[hi]);
    out.push(
      `rgb(${lerp(r1, r2, f)}, ${lerp(g1, g2, f)}, ${lerp(b1, b2, f)})`,
    );
  }
  return out;
}

function isoRange(months: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - months);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function RetentionCurveChart() {
  const [view, setView] = useState<ViewKey>("stacked");
  const [preset, setPreset] = useState<PresetKey>("12m");
  const months = PRESETS.find((p) => p.key === preset)?.months ?? 12;
  const range = useMemo(() => isoRange(months), [months]);

  const query = useQuery({
    queryKey: queryKeys.loyalty.retentionCurve({ preset }),
    queryFn: ({ signal }) => loyaltyApi.retentionCurve(range, signal),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const data = query.data;

  const hasEarlier = data?.cohorts.some((c) => c.isEarlier) ?? false;

  const option = useMemo<EChartsOption | null>(() => {
    if (!data || data.cohorts.length === 0) return null;

    // Individual cohorts get the gradient; the folded "earlier" base is neutral.
    const individual = data.cohorts.filter((c) => !c.isEarlier);
    const ramp = cohortColors(individual.length);
    let rampIdx = 0;

    const series = data.cohorts.map((cohort) => {
      const color = cohort.isEarlier ? EARLIER : ramp[rampIdx++];
      return {
        name: cohort.label,
        type: "line" as const,
        stack: "clients",
        smooth: 0.2,
        showSymbol: false,
        // A hairline surface-colored top edge makes each stacked band read as a
        // distinct ribbon, so you can follow one cohort's rise and erosion even
        // without hovering.
        lineStyle: { width: 1, color: SURFACE, opacity: 0.55 },
        areaStyle: { color, opacity: 0.94 },
        emphasis: { focus: "series" as const },
        data: cohort.values,
      };
    });

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: SURFACE,
        borderColor: GRID,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: INK, fontSize: 12 },
        extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.12); border-radius: 8px;",
        formatter: (p: unknown) => {
          const params = p as {
            seriesName: string;
            dataIndex: number;
            value: number;
            seriesIndex: number;
          };
          const cohort = data.cohorts[params.seriesIndex];
          const bucket = data.buckets[params.dataIndex];
          const size = cohort.cohortSize || 1;
          const pct = Math.round((100 * params.value) / size);
          const retention = cohort.isEarlier
            ? ""
            : `<br/><span style="color:${MUTED}">${pct} % de la cohorte (${cohort.cohortSize}) encore active</span>`;
          return `<b>${cohort.label}</b> · ${bucket.label}<br/>${params.value} client(s) actif(s)${retention}`;
        },
      },
      grid: { left: 8, right: 16, top: 12, bottom: data.buckets.length > 14 ? 44 : 28, containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.buckets.map((b) => b.label),
        axisLabel: {
          color: MUTED,
          fontSize: 11,
          hideOverlap: true,
        },
        axisLine: { lineStyle: { color: AXIS } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        name: "Clients actifs",
        nameTextStyle: { color: MUTED, fontSize: 11, align: "left" },
        nameGap: 12,
        axisLabel: { color: MUTED, fontSize: 11 },
        splitLine: { lineStyle: { color: GRID, width: 1 } },
      },
      dataZoom:
        data.buckets.length > 40
          ? [
              {
                type: "slider",
                height: 16,
                bottom: 6,
                borderColor: GRID,
                backgroundColor: "transparent",
                fillerColor: "rgba(42,120,214,0.12)",
                handleStyle: { color: "#2a78d6" },
                textStyle: { color: MUTED, fontSize: 10 },
              },
              { type: "inside" },
            ]
          : undefined,
      series,
    };
  }, [data]);

  const ready = !query.isLoading && data && data.cohorts.length > 0;

  return (
    <SectionCard
      title="Rétention du portefeuille client"
      description={
        view === "stacked"
          ? "Chaque bande = les clients acquis un mois donné, empilés. Sa hauteur fond quand cette génération cesse de revenir — on voit qui reste et quand ils partent."
          : "Part de chaque cohorte (mois d'acquisition) encore active, N mois plus tard. La diagonale se lit comme la survie d'une génération de clients."
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => v && setView(v as ViewKey)}>
            <TabsList size="sm">
              <TabsTrigger value="stacked">Empilé</TabsTrigger>
              <TabsTrigger value="cohort">Cohortes</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={preset} onValueChange={(v) => v && setPreset(v as PresetKey)}>
            <TabsList size="sm">
              {PRESETS.map((p) => (
                <TabsTrigger key={p.key} value={p.key}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      }
    >
      {!ready ? (
        <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
          {query.isLoading
            ? "Chargement…"
            : "Pas encore assez de clients pour tracer la rétention."}
        </div>
      ) : view === "cohort" ? (
        <CohortRetentionGrid data={data} />
      ) : (
        <div className="h-80">
          {option && (
            <ReactECharts
              option={option}
              notMerge
              lazyUpdate
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
            />
          )}
        </div>
      )}

      {ready && view === "stacked" && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {hasEarlier && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-3 rounded-sm"
                style={{ backgroundColor: EARLIER }}
              />
              Clients antérieurs
            </span>
          )}
          <span className="inline-flex items-center gap-2">
            <span>Cohortes&nbsp;: anciennes</span>
            <span
              className="h-3 w-28 rounded-sm ring-1 ring-black/5"
              style={{
                background: `linear-gradient(90deg, ${RAMP[0]}, ${RAMP[RAMP.length - 1]})`,
              }}
            />
            <span>récentes</span>
          </span>
          <span className="ml-auto">
            Client compté actif tant qu&apos;il a eu une activité dans les{" "}
            {data ? Math.round(data.churnHorizonDays / 30) : 18} derniers mois.
          </span>
        </div>
      )}
    </SectionCard>
  );
}
