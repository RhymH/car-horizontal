"use client";

import { useMemo } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { SectionCard } from "@/components/ui/SectionCard";
import type { LoyaltyTrendPoint } from "@/lib/api/loyalty";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

interface Props {
  series: LoyaltyTrendPoint[];
  loading?: boolean;
}

export function RetentionTrendChart({ series, loading }: Props) {
  const data = useMemo(
    () => ({
      labels: series.map((p) => p.label),
      datasets: [
        {
          label: "Rétention 12 mois",
          data: series.map((p) => p.value),
          borderColor: "rgb(16, 185, 129)",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    }),
    [series],
  );

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          intersect: false,
          mode: "index",
          callbacks: {
            label: (ctx) => `${ctx.parsed.y}%`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: (v) => `${v}%` },
        },
      },
    }),
    [],
  );

  return (
    <SectionCard
      title="Tendance de rétention"
      description="Part des clients existants 12 mois plus tôt qui sont revenus"
    >
      <div className="relative h-56">
        {loading ? (
          <div className="size-full animate-pulse rounded bg-muted/40" />
        ) : (
          <Line data={data} options={options} />
        )}
      </div>
    </SectionCard>
  );
}
