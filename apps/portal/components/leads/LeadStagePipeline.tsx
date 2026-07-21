"use client";

import { Check, RotateCcw, ThumbsDown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { leadStageLabels, openLeadStages } from "@/lib/schemas/lead";
import type { LeadStageApi } from "@/lib/api/leads";

export interface LeadStagePipelineProps {
  stage: LeadStageApi;
  lostReason: string | null;
  pending: boolean;
  onStageSelect: (stage: LeadStageApi) => void;
  onWin: () => void;
  onLose: () => void;
  onReopen: () => void;
}

/**
 * Horizontal pipeline stepper. Open stages are clickable steps; Won / Lost are
 * terminal outcomes with their own buttons and banner.
 */
export function LeadStagePipeline({
  stage,
  lostReason,
  pending,
  onStageSelect,
  onWin,
  onLose,
  onReopen,
}: LeadStagePipelineProps) {
  if (stage === "Won" || stage === "Lost") {
    const won = stage === "Won";
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
          won
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10"
            : "border-destructive/25 bg-destructive/5",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              won
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {won ? <Trophy className="size-4.5" /> : <ThumbsDown className="size-4.5" />}
          </span>
          <div>
            <p className="text-sm font-semibold">
              {won ? "Prospect converti en client" : "Prospect perdu"}
            </p>
            <p className="text-sm text-muted-foreground">
              {won
                ? "Le suivi commercial est terminé : la fiche est passée en client actif."
                : lostReason
                  ? `Raison : ${lostReason}`
                  : "Aucune raison renseignée."}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onReopen} disabled={pending}>
          <RotateCcw />
          Rouvrir le suivi
        </Button>
      </div>
    );
  }

  const currentIndex = openLeadStages.indexOf(stage);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <ol className="flex flex-1 flex-wrap items-center gap-1.5">
        {openLeadStages.map((s, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          return (
            <li key={s} className="flex items-center gap-1.5">
              {index > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "h-px w-4 sm:w-6",
                    index <= currentIndex ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => !current && onStageSelect(s)}
                title={
                  current ? "Étape actuelle" : `Passer à « ${leadStageLabels[s]} »`
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60",
                  current
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : done
                      ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {done && <Check className="size-3.5" />}
                {leadStageLabels[s]}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onWin}
          disabled={pending}
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
        >
          <Trophy />
          Gagné
        </Button>
        <Button variant="destructive" size="sm" onClick={onLose} disabled={pending}>
          <ThumbsDown />
          Perdu
        </Button>
      </div>
    </div>
  );
}
