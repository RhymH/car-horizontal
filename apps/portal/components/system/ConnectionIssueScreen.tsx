"use client";

import { PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionDiagnostics } from "@/components/system/ConnectionDiagnostics";
import { cn } from "@/lib/utils";

/**
 * Écran plein cadre « quelque chose ne répond plus ». Il lance immédiatement le
 * diagnostic pour dire à l'utilisateur si le problème vient de chez lui ou de
 * chez nous, plutôt que d'afficher une erreur muette.
 */
export function ConnectionIssueScreen({
  title = "La connexion avec CarHorizontal est interrompue",
  description = "Nous vérifions d'où vient le problème. Cela prend quelques secondes.",
  onRetry,
  retryLabel,
  onDismiss,
  dismissLabel = "Continuer quand même",
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-2xl px-6 py-10", className)}>
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <PlugZap className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <ConnectionDiagnostics
        className="mt-6"
        onRetry={onRetry}
        retryLabel={retryLabel}
      />

      {onDismiss && (
        <div className="mt-6 border-t border-border pt-4">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            {dismissLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
