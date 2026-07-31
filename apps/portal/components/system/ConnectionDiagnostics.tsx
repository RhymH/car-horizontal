"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Database,
  Globe,
  Loader2,
  MinusCircle,
  RefreshCw,
  Server,
  Wifi,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/env";
import {
  initialChecks,
  runConnectivityDiagnostics,
  type CheckId,
  type CheckStatus,
  type DiagnosticCheck,
  type Verdict,
} from "@/lib/diagnostics/connectivity";
import { cn } from "@/lib/utils";

const CHECK_ICON: Record<CheckId, LucideIcon> = {
  internet: Wifi,
  portal: Globe,
  api: Server,
  database: Database,
};

const STATUS_STYLE: Record<
  CheckStatus,
  { icon: LucideIcon; className: string; spin?: boolean; text: string }
> = {
  idle: { icon: MinusCircle, className: "text-muted-foreground", text: "En attente" },
  running: {
    icon: Loader2,
    className: "text-muted-foreground",
    spin: true,
    text: "Vérification…",
  },
  ok: { icon: CheckCircle2, className: "text-emerald-600", text: "OK" },
  warn: { icon: AlertTriangle, className: "text-amber-600", text: "Anomalie" },
  fail: { icon: XCircle, className: "text-destructive", text: "Échec" },
  skipped: { icon: MinusCircle, className: "text-muted-foreground", text: "Non testé" },
};

const VERDICT_STYLE: Record<Verdict["side"], string> = {
  user: "border-amber-500/40 bg-amber-500/10",
  us: "border-destructive/40 bg-destructive/10",
  none: "border-emerald-500/40 bg-emerald-500/10",
  unknown: "border-border bg-muted/40",
};

const VERDICT_ICON: Record<Verdict["side"], LucideIcon> = {
  user: AlertTriangle,
  us: XCircle,
  none: CheckCircle2,
  unknown: AlertTriangle,
};

function CheckRow({ check }: { check: DiagnosticCheck }) {
  const Icon = CHECK_ICON[check.id];
  const status = STATUS_STYLE[check.status];
  const StatusIcon = status.icon;

  return (
    <li className="flex items-start gap-3 border-b border-border/60 py-3 last:border-b-0">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-[1.1rem]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.95rem] font-medium leading-snug">{check.label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {check.detail ?? check.description}
        </p>
      </div>
      <span
        className={cn(
          "mt-0.5 flex shrink-0 items-center gap-1.5 text-sm font-medium",
          status.className,
        )}
      >
        <StatusIcon className={cn("size-4", status.spin && "animate-spin")} />
        <span className="hidden sm:inline">{status.text}</span>
        {check.status === "ok" && check.latencyMs !== undefined && (
          <span className="hidden font-normal text-muted-foreground md:inline">
            {check.latencyMs} ms
          </span>
        )}
      </span>
    </li>
  );
}

export function ConnectionDiagnostics({
  autoRun = true,
  onRetry,
  retryLabel = "Réessayer",
  className,
}: {
  /** Lance le diagnostic dès l'affichage. */
  autoRun?: boolean;
  /** Action de reprise (recharger la page, relancer la requête…). */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  const [checks, setChecks] = useState<DiagnosticCheck[]>(() =>
    autoRun
      ? initialChecks()
      : initialChecks().map((check) => ({ ...check, status: "idle" as const })),
  );
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [running, setRunning] = useState(autoRun);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  const execute = useCallback(async () => {
    try {
      const report = await runConnectivityDiagnostics(setChecks);
      setChecks(report.checks);
      setVerdict(report.verdict);
    } finally {
      setRanAt(new Date());
      setRunning(false);
    }
  }, []);

  // Relance manuelle : on remet les lignes à zéro avant de sonder à nouveau.
  const run = useCallback(() => {
    setRunning(true);
    setVerdict(null);
    setChecks(initialChecks());
    void execute();
  }, [execute]);

  useEffect(() => {
    if (autoRun) void execute();
  }, [autoRun, execute]);

  const copyReport = async () => {
    const lines = [
      "Diagnostic CarHorizontal",
      `Date : ${(ranAt ?? new Date()).toISOString()}`,
      `Page : ${typeof window !== "undefined" ? window.location.href : "-"}`,
      `API : ${apiBaseUrl}`,
      "",
      ...checks.map(
        (check) =>
          `- ${check.label} : ${STATUS_STYLE[check.status].text}${
            check.detail ? ` — ${check.detail}` : ""
          }${check.latencyMs !== undefined ? ` (${check.latencyMs} ms)` : ""}`,
      ),
      "",
      verdict ? `Conclusion : ${verdict.title} — ${verdict.message}` : "",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Rapport copié — collez-le dans votre message au support.");
    } catch {
      toast.error("Impossible de copier le rapport.");
    }
  };

  const VerdictIcon = verdict ? VERDICT_ICON[verdict.side] : AlertTriangle;

  return (
    <div className={cn("space-y-5", className)}>
      <ul className="rounded-xl border border-border bg-card px-4">
        {checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </ul>

      {running && !verdict && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Analyse en cours…
        </p>
      )}

      {verdict && (
        <div className={cn("rounded-xl border p-4", VERDICT_STYLE[verdict.side])}>
          <div className="flex items-start gap-3">
            <VerdictIcon
              className={cn(
                "mt-0.5 size-5 shrink-0",
                verdict.side === "us" && "text-destructive",
                verdict.side === "user" && "text-amber-600",
                verdict.side === "none" && "text-emerald-600",
              )}
            />
            <div className="space-y-2">
              <p className="text-base font-semibold">{verdict.title}</p>
              <p className="text-[0.95rem] leading-relaxed text-foreground/80">
                {verdict.message}
              </p>
              {verdict.advice.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-[0.95rem] text-foreground/80">
                  {verdict.advice.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {onRetry && (
          <Button onClick={onRetry} disabled={running}>
            {retryLabel}
          </Button>
        )}
        <Button variant="outline" onClick={run} disabled={running}>
          <RefreshCw className={cn("size-4", running && "animate-spin")} />
          Relancer le diagnostic
        </Button>
        <Button variant="ghost" onClick={() => void copyReport()} disabled={running}>
          <ClipboardCopy className="size-4" />
          Copier le rapport
        </Button>
      </div>

      {ranAt && (
        <p className="text-xs text-muted-foreground">
          Diagnostic effectué à {ranAt.toLocaleTimeString("fr-FR")} · services
          testés : {apiBaseUrl}
        </p>
      )}
    </div>
  );
}
