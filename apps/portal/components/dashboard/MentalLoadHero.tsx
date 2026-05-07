import { Sparkles } from "lucide-react";
import type { DashboardMentalLoad } from "@/lib/api/dashboard";

interface Props {
  data: DashboardMentalLoad;
}

const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long" });

export function MentalLoadHero({ data }: Props) {
  const monthLabel = monthFmt.format(new Date());
  const count = data.anticipatedThisMonth;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-emerald-500/5 p-5 shadow-sm">
      <div className="absolute -right-6 -top-6 size-32 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            Charge mentale évitée
          </div>
          <p className="text-2xl font-semibold tracking-tight">
            <span className="text-3xl text-primary">{count}</span> entretien
            {count !== 1 ? "s" : ""} anticipé{count !== 1 ? "s" : ""} en{" "}
            <span className="capitalize">{monthLabel}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            CarHorizontal a planifié ces échéances pour vous, sans que vous ayez
            à y penser.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background/60 px-4 py-3 text-center">
          <div className="text-2xl font-semibold">
            {data.anticipatedLast12Months}
          </div>
          <div className="text-xs text-muted-foreground">
            sur 12 derniers mois
          </div>
        </div>
      </div>
    </div>
  );
}
