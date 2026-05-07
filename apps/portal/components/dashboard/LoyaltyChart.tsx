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
import type { DashboardChartPoint } from "@/lib/api/dashboard";

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
  series: DashboardChartPoint[];
  loading?: boolean;
}

export function LoyaltyChart({ series, loading }: Props) {
  const data = useMemo(
    () => ({
      labels: series.map((p) => p.label),
      datasets: [
        {
          label: "Clients revenus",
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
        tooltip: { intersect: false, mode: "index" },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    }),
    [],
  );

  const allZero = series.every((p) => p.value === 0);

  return (
    <SectionCard
      title="Retour clients"
      description="Sur les 12 derniers mois"
    >
      <div className="relative h-56">
        {loading ? (
          <div className="size-full animate-pulse rounded bg-muted/40" />
        ) : (
          <>
            <Line data={data} options={options} />
            {allZero && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                  Indicateur disponible une fois la fidélisation activée
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}
