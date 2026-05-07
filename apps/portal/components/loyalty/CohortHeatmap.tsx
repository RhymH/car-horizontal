"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { SectionCard } from "@/components/ui/SectionCard";
import type { LoyaltyCohorts } from "@/lib/api/loyalty";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface Props {
  data: LoyaltyCohorts | undefined;
  loading?: boolean;
}

export function CohortHeatmap({ data, loading }: Props) {
  const option = useMemo(() => {
    if (!data || data.cohorts.length === 0) return null;

    const yLabels = data.cohorts.map((c) => c.cohortLabel);
    const maxOffset = Math.max(1, data.maxOffsetMonths);
    const xLabels = Array.from({ length: maxOffset }, (_, i) => `M+${i + 1}`);

    const cells: Array<[number, number, number]> = [];
    data.cohorts.forEach((row, yIdx) => {
      row.cells.forEach((cell) => {
        cells.push([cell.offsetMonths - 1, yIdx, cell.retentionPct]);
      });
    });

    return {
      tooltip: {
        position: "top",
        formatter: (params: { value: [number, number, number]; data: [number, number, number] }) => {
          const [x, y, v] = params.value;
          const cohort = data.cohorts[y];
          return `<strong>${cohort.cohortLabel}</strong> (n=${cohort.cohortSize})<br/>${xLabels[x]} : <b>${v}%</b>`;
        },
      },
      grid: { top: 30, bottom: 40, left: 80, right: 20 },
      xAxis: {
        type: "category",
        data: xLabels,
        splitArea: { show: true },
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: "category",
        data: yLabels,
        splitArea: { show: true },
        axisLabel: { fontSize: 11 },
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        inRange: {
          color: ["#fef3c7", "#fbbf24", "#10b981", "#047857"],
        },
        text: ["100%", "0%"],
        textStyle: { fontSize: 10 },
      },
      series: [
        {
          name: "Rétention",
          type: "heatmap",
          data: cells,
          label: { show: true, formatter: (p: { value: [number, number, number] }) => `${p.value[2]}` },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.5)" } },
        },
      ],
    };
  }, [data]);

  return (
    <SectionCard
      title="Cohortes de rétention"
      description="% de clients revenus par mois écoulé depuis l'acquisition"
    >
      <div className="h-80">
        {loading || !option ? (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            {loading ? "Chargement…" : "Pas encore de cohortes à afficher."}
          </div>
        ) : (
          <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
        )}
      </div>
    </SectionCard>
  );
}
