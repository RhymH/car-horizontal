"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConnectionIssueScreen } from "@/components/system/ConnectionIssueScreen";
import {
  attachOutageListeners,
  dismissOutageScreen,
  reportNetworkSuccess,
  useOutageState,
} from "@/lib/diagnostics/outage";

/**
 * Monté une fois dans les providers : surveille les pannes réseau signalées par
 * l'intercepteur axios et recouvre l'application par l'écran de diagnostic
 * quand l'API (ou le réseau de l'utilisateur) ne répond plus.
 */
export function ConnectionOutageOverlay() {
  const outage = useOutageState();
  const queryClient = useQueryClient();

  useEffect(() => {
    attachOutageListeners();
  }, []);

  if (!outage.open) return null;

  const retry = () => {
    reportNetworkSuccess();
    void queryClient.refetchQueries({ type: "active" });
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Diagnostic de connexion"
      className="fixed inset-0 z-100 overflow-y-auto bg-background/95 backdrop-blur-sm"
    >
      <div className="flex min-h-full items-center justify-center">
        <ConnectionIssueScreen
          title={
            outage.reason === "offline"
              ? "Votre appareil est hors ligne"
              : "CarHorizontal ne répond plus"
          }
          description={
            outage.reason === "offline"
              ? "Le navigateur signale une perte de connexion. Vérification en cours pour confirmer d'où vient le problème."
              : "Les dernières requêtes n'ont pas abouti. Nous vérifions si le problème vient de votre connexion ou de nos services."
          }
          onRetry={retry}
          retryLabel="Réessayer maintenant"
          onDismiss={dismissOutageScreen}
        />
      </div>
    </div>
  );
}
