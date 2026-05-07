"use client";

import { useMemo } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { SectionCard } from "@/components/ui/SectionCard";
import type { DashboardChartPoint } from "@/lib/api/dashboard";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  series: DashboardChartPoint[];
  loading?: boolean;
}

export function RemindersChart({ series, loading }: Props) {
  const data = useMemo(
    () => ({
      labels: series.map((p) => p.label),
      datasets: [
        {
          label: "Rappels envoyés",
          data: series.map((p) => p.value),
          backgroundColor: "rgba(99, 102, 241, 0.6)",
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    }),
    [series],
  );

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { intersect: false, mode: "index" },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    }),
    [],
  );

  return (
    <SectionCard
      title="Rappels envoyés"
      description="Sur les 30 derniers jours"
    >
      <div className="h-56">
        {loading ? (
          <div className="size-full animate-pulse rounded bg-muted/40" />
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </SectionCard>
  );
}
