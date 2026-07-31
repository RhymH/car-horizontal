"use client";

import { useMemo } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { BadgeEuro, TrendingDown, TrendingUp } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { SalePriceChange } from "@/lib/api/sales";
import { currencyFmt, money, shortDate } from "@/components/sales/saleFormat";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

/**
 * Évolution du prix affiché. La courbe est en escalier (`stepped`) : entre deux
 * changements, le prix n'a pas glissé progressivement — il est resté le même.
 */
export function SalePriceHistorySection({
  history,
  onChangePrice,
}: {
  history: SalePriceChange[];
  onChangePrice: () => void;
}) {
  const data = useMemo(() => {
    const points = history.map((h) => ({
      x: shortDate(h.changedAt),
      y: h.price,
    }));

    // Prolonge le palier jusqu'à aujourd'hui pour que le dernier prix soit lisible.
    if (points.length > 0) {
      points.push({ x: "aujourd'hui", y: points[points.length - 1].y });
    }

    return {
      labels: points.map((p) => p.x),
      datasets: [
        {
          label: "Prix affiché",
          data: points.map((p) => p.y),
          borderColor: "rgb(37, 99, 235)",
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          fill: true,
          stepped: "after" as const,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [history]);

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => currencyFmt.format(ctx.parsed.y ?? 0),
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: (v) => currencyFmt.format(Number(v)) },
          grid: { color: "rgba(127,127,127,0.15)" },
        },
        x: { grid: { display: false } },
      },
    }),
    [],
  );

  return (
    <SectionCard
      title="Évolution du prix"
      description={
        history.length === 0
          ? "Aucun changement enregistré"
          : `${history.length} changement${history.length > 1 ? "s" : ""}`
      }
      actions={
        <Button variant="outline" size="sm" onClick={onChangePrice}>
          <BadgeEuro />
          Changer le prix
        </Button>
      }
    >
      {history.length === 0 ? (
        <EmptyState
          icon={BadgeEuro}
          title="Pas encore de prix"
          description="Fixez un prix affiché : chaque modification sera historisée ici, avec son motif."
          action={
            <Button size="sm" onClick={onChangePrice}>
              Fixer le prix
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {history.length > 1 && (
            <div className="h-48">
              <Line data={data} options={options} />
            </div>
          )}

          <ol className="flex flex-col gap-2">
            {[...history].reverse().map((h) => {
              const delta =
                h.previousPrice == null ? null : h.price - h.previousPrice;
              return (
                <li
                  key={h.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="font-semibold tabular-nums">{money(h.price)}</span>
                  {delta != null && delta !== 0 && (
                    <span
                      className={
                        delta < 0
                          ? "flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"
                          : "flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
                      }
                    >
                      {delta < 0 ? (
                        <TrendingDown className="size-3.5" />
                      ) : (
                        <TrendingUp className="size-3.5" />
                      )}
                      {money(Math.abs(delta))}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {shortDate(h.changedAt)}
                  </span>
                  {h.reason && (
                    <span className="w-full text-xs text-muted-foreground">
                      {h.reason}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </SectionCard>
  );
}
