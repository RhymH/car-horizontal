"use client";

import { useMemo } from "react";
import type { LoyaltyRetentionCurve } from "@/lib/api/loyalty";
import { cn } from "@/lib/utils";

// Sequential green ramp (pale → deep): low retention light, high retention dark.
const RAMP: [number, number, number][] = [
  [234, 250, 241], // #eafaf1
  [163, 230, 201], // #a3e6c9
  [52, 199, 145], // #34c791
  [4, 120, 87], // #047857
];

function cellBg(pct: number): string {
  const p = Math.max(0, Math.min(100, pct)) / 100;
  const x = p * (RAMP.length - 1);
  const lo = Math.floor(x);
  const hi = Math.min(lo + 1, RAMP.length - 1);
  const f = x - lo;
  const c = (i: number) => Math.round(RAMP[lo][i] + (RAMP[hi][i] - RAMP[lo][i]) * f);
  return `rgb(${c(0)}, ${c(1)}, ${c(2)})`;
}

function monthIndexFromKey(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return y * 12 + (m - 1);
}
function monthIndexFromIso(iso: string): number {
  const d = new Date(iso);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

interface Cell {
  pct: number;
  active: number;
}
interface Row {
  key: string;
  label: string;
  size: number;
  cells: (Cell | null)[]; // aligned to offsets 0..maxOffset
}

export function CohortRetentionGrid({ data }: { data: LoyaltyRetentionCurve }) {
  const { rows, maxOffset } = useMemo(() => {
    const bucketMonthIdx = data.buckets.map((b) => monthIndexFromIso(b.period));
    const lastMonthIdx = bucketMonthIdx.length
      ? Math.max(...bucketMonthIdx)
      : 0;

    const individual = data.cohorts.filter((c) => !c.isEarlier && c.cohortSize > 0);
    const maxOff = individual.reduce(
      (acc, c) => Math.max(acc, lastMonthIdx - monthIndexFromKey(c.key)),
      0,
    );

    const built: Row[] = individual.map((cohort) => {
      const cohortIdx = monthIndexFromKey(cohort.key);
      const span = lastMonthIdx - cohortIdx;

      const cells: (Cell | null)[] = [];
      for (let o = 0; o <= span; o++) {
        // Latest bucket that falls in the calendar month (cohortIdx + o).
        let value: number | null = null;
        for (let bi = bucketMonthIdx.length - 1; bi >= 0; bi--) {
          if (bucketMonthIdx[bi] === cohortIdx + o) {
            value = cohort.values[bi];
            break;
          }
        }
        cells.push(
          value === null
            ? null
            : { active: value, pct: Math.round((100 * value) / cohort.cohortSize) },
        );
      }
      return {
        key: cohort.key,
        label: cohort.label,
        size: cohort.cohortSize,
        cells,
      };
    });

    // Newest cohort on top (Amplitude/Mixpanel convention).
    built.reverse();
    return { rows: built, maxOffset: maxOff };
  }, [data]);

  if (rows.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        Pas encore de cohortes complètes à afficher sur cette période.
      </div>
    );
  }

  const offsets = Array.from({ length: maxOffset + 1 }, (_, i) => i);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card px-2 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cohorte
              </th>
              <th className="px-2 py-1.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Taille
              </th>
              {offsets.map((o) => (
                <th
                  key={o}
                  className="min-w-11 px-1 py-1.5 text-center text-xs font-medium text-muted-foreground"
                  title={`${o} mois après l'acquisition`}
                >
                  M{o}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="sticky left-0 z-10 bg-card px-2 py-1 whitespace-nowrap font-medium capitalize">
                  {row.label}
                </td>
                <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                  {row.size}
                </td>
                {offsets.map((o) => {
                  const cell = row.cells[o];
                  if (cell === undefined || cell === null) {
                    return <td key={o} className="px-1 py-1" />;
                  }
                  return (
                    <td
                      key={o}
                      className={cn(
                        "rounded px-1 py-1 text-center text-xs tabular-nums",
                        cell.pct >= 50 ? "text-white" : "text-emerald-950",
                      )}
                      style={{ backgroundColor: cellBg(cell.pct) }}
                      title={`${cell.active} sur ${row.size} clients actifs`}
                    >
                      {cell.pct}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>Mois écoulés depuis l&apos;acquisition →</span>
        <span className="inline-flex items-center gap-1.5">
          0 %
          <span
            className="h-3 w-24 rounded-sm ring-1 ring-black/5"
            style={{
              background: `linear-gradient(90deg, ${cellBg(0)}, ${cellBg(50)}, ${cellBg(100)})`,
            }}
          />
          100 % encore actifs
        </span>
      </div>
    </div>
  );
}
