"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/leads/stats/EChart";
import {
  baseAxisLabel,
  baseLegend,
  baseSplitLine,
  baseTooltip,
  percentFr,
  useChartTheme,
} from "@/components/leads/stats/chartTheme";
import { leadStageLabels } from "@/lib/schemas/lead";
import type {
  LeadStats,
  LeadStatsBreakdown,
  LeadStatsFunnelStep,
  LeadStatsTimePoint,
} from "@/lib/api/leads";

const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" });

function bucketLabel(iso: string, granularity: LeadStats["granularity"]): string {
  const d = new Date(iso);
  if (granularity === "month") return monthFmt.format(d);
  return dayFmt.format(d);
}

// ── Tendance dans le temps ───────────────────────────────────────────────────

export function TrendChart({
  timeline,
  granularity,
}: {
  timeline: LeadStatsTimePoint[];
  granularity: LeadStats["granularity"];
}) {
  const t = useChartTheme();

  const option = useMemo<EChartsOption>(() => {
    const labels = timeline.map((p) => bucketLabel(p.period, granularity));
    const line = (name: string, color: string, data: number[]) => ({
      name,
      type: "line" as const,
      data,
      lineStyle: { width: 2, color },
      itemStyle: { color },
      symbol: "circle",
      symbolSize: 8,
      showSymbol: false,
      emphasis: { focus: "series" as const },
      smooth: 0.15,
    });
    return {
      legend: baseLegend(t),
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: t.axis } },
        ...baseTooltip(t),
      },
      grid: { left: 8, right: 16, top: 36, bottom: timeline.length > 14 ? 56 : 28, containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: baseAxisLabel(t),
        axisLine: { lineStyle: { color: t.axis } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: baseAxisLabel(t),
        splitLine: baseSplitLine(t),
      },
      dataZoom:
        timeline.length > 14
          ? [
              {
                type: "slider",
                height: 18,
                bottom: 8,
                borderColor: t.grid,
                backgroundColor: "transparent",
                fillerColor: t.dark ? "rgba(57,135,229,0.18)" : "rgba(42,120,214,0.12)",
                handleStyle: { color: t.blue },
                textStyle: { color: t.muted, fontSize: 10 },
              },
              { type: "inside" },
            ]
          : undefined,
      series: [
        line("Nouveaux prospects", t.blue, timeline.map((p) => p.newLeads)),
        line("Convertis", t.green, timeline.map((p) => p.won)),
        line("Perdus", t.red, timeline.map((p) => p.lost)),
      ],
    };
  }, [timeline, granularity, t]);

  return <EChart option={option} height={300} />;
}

// ── Funnel de la cohorte ─────────────────────────────────────────────────────

export function FunnelChart({ funnel }: { funnel: LeadStatsFunnelStep[] }) {
  const t = useChartTheme();

  const option = useMemo<EChartsOption>(() => {
    const steps = [...funnel];
    const total = steps[0]?.count ?? 0;
    // Top-down reading order: first stage on top.
    const reversed = [...steps].reverse();
    return {
      tooltip: {
        trigger: "item",
        ...baseTooltip(t),
        formatter: (p: unknown) => {
          const { name, value, dataIndex } = p as {
            name: string;
            value: number;
            dataIndex: number;
          };
          const idx = steps.length - 1 - dataIndex;
          const prev = idx > 0 ? steps[idx - 1].count : null;
          const stepRate =
            prev && prev > 0 ? ` · ${percentFr(value / prev)} de l'étape précédente` : "";
          return `<b>${name}</b><br/>${value} prospect(s) · ${percentFr(
            total > 0 ? value / total : 0,
          )} de la cohorte${stepRate}`;
        },
      },
      grid: { left: 8, right: 76, top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: reversed.map((s) => leadStageLabels[s.stage]),
        axisLabel: { ...baseAxisLabel(t), fontSize: 12, color: t.textSecondary },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: reversed.map((s, i) => ({
            value: s.count,
            itemStyle: {
              color: t.blueRamp[Math.min(steps.length - 1 - i, t.blueRamp.length - 1)],
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 20,
          label: {
            show: true,
            position: "right",
            color: t.textPrimary,
            fontSize: 12,
            formatter: (p: unknown) => {
              const { value } = p as { value: number };
              return total > 0 ? `${value}  ·  ${percentFr(value / total)}` : `${value}`;
            },
          },
        },
      ],
    };
  }, [funnel, t]);

  return <EChart option={option} height={240} />;
}

// ── Répartition campagne / source (barres empilées horizontales) ─────────────

export function BreakdownChart({
  rows,
  emptyLabel,
}: {
  rows: LeadStatsBreakdown[];
  emptyLabel: string;
}) {
  const t = useChartTheme();

  const option = useMemo<EChartsOption>(() => {
    // Largest cohorts on top.
    const sorted = [...rows].reverse();
    const gap = { borderColor: t.surface, borderWidth: 1 };
    const stack = (
      name: string,
      color: string,
      data: number[],
      last = false,
    ) => ({
      name,
      type: "bar" as const,
      stack: "total",
      data,
      barWidth: 16,
      itemStyle: last
        ? { color, ...gap, borderRadius: [0, 4, 4, 0] }
        : { color, ...gap },
      emphasis: { focus: "series" as const },
    });
    return {
      legend: baseLegend(t),
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        ...baseTooltip(t),
        formatter: (params: unknown) => {
          const list = params as {
            name: string;
            seriesName: string;
            value: number;
            dataIndex: number;
          }[];
          if (!list.length) return "";
          const row = sorted[list[0].dataIndex];
          const conv = row.created > 0 ? percentFr(row.won / row.created) : "—";
          const lines = list
            .map((s) => `${s.seriesName} : <b>${s.value}</b>`)
            .join("<br/>");
          return `<b>${list[0].name}</b><br/>${lines}<br/>Taux de conversion : <b>${conv}</b>`;
        },
      },
      grid: { left: 8, right: 56, top: 32, bottom: 8, containLabel: true },
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: baseAxisLabel(t),
        splitLine: baseSplitLine(t),
      },
      yAxis: {
        type: "category",
        data: sorted.map((r) => r.key),
        axisLabel: {
          ...baseAxisLabel(t),
          fontSize: 12,
          color: t.textSecondary,
          width: 118,
          overflow: "truncate" as const,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        // Fixed order keeps green and red apart (blue sits between them).
        stack("Gagnés", t.green, sorted.map((r) => r.won)),
        stack("En cours", t.blue, sorted.map((r) => r.open)),
        {
          ...stack("Perdus", t.red, sorted.map((r) => r.lost), true),
          label: {
            show: true,
            position: "right" as const,
            color: t.textSecondary,
            fontSize: 11,
            formatter: (p: unknown) => {
              const { dataIndex } = p as { dataIndex: number };
              const row = sorted[dataIndex];
              return row.created > 0 ? percentFr(row.won / row.created) : "";
            },
          },
        },
      ],
    };
  }, [rows, t]);

  if (rows.length === 0) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return <EChart option={option} height={Math.max(160, 40 + rows.length * 34)} />;
}

// ── Raisons de perte ─────────────────────────────────────────────────────────

export function LostReasonsChart({
  reasons,
}: {
  reasons: { reason: string; count: number }[];
}) {
  const t = useChartTheme();

  const option = useMemo<EChartsOption>(() => {
    const sorted = [...reasons].reverse();
    return {
      tooltip: { trigger: "item", ...baseTooltip(t) },
      grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: sorted.map((r) => r.reason),
        axisLabel: {
          ...baseAxisLabel(t),
          fontSize: 12,
          color: t.textSecondary,
          width: 150,
          overflow: "truncate" as const,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: sorted.map((r) => r.count),
          barWidth: 14,
          itemStyle: { color: t.red, borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: "right",
            color: t.textPrimary,
            fontSize: 12,
          },
        },
      ],
    };
  }, [reasons, t]);

  if (reasons.length === 0) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Aucune perte sur la période — rien à analyser, tant mieux.
      </p>
    );
  }

  return <EChart option={option} height={Math.max(140, 24 + reasons.length * 32)} />;
}
