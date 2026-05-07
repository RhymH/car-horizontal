import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  hrefLabel?: string;
  trendPct?: number | null;
  tone?: "default" | "warning" | "danger" | "success";
}

const TONE_CLASSES: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-destructive/10 text-destructive",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  hrefLabel,
  trendPct,
  tone = "default",
}: KpiCardProps) {
  const showTrend = typeof trendPct === "number" && Number.isFinite(trendPct);
  const trendUp = showTrend && (trendPct ?? 0) >= 0;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            TONE_CLASSES[tone],
          )}
        >
          <Icon className="size-5" />
        </span>
        {showTrend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trendUp
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {trendUp ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {trendUp ? "+" : ""}
            {trendPct}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {href && (
        <Link
          href={href}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {hrefLabel ?? "Voir tous"}
          <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}
