"use client"; // Les error boundaries doivent être des Client Components.

import { useEffect } from "react";
import "./globals.css";
import { ConnectionIssueScreen } from "@/components/system/ConnectionIssueScreen";

/**
 * Dernier filet : remplace le layout racine quand celui-ci casse. On affiche
 * directement le diagnostic — dans ce cas de figure, l'application est
 * inutilisable et la seule question utile est « d'où vient la panne ? ».
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <title>CarHorizontal — incident</title>
        <div className="flex min-h-svh items-center justify-center">
          <ConnectionIssueScreen
            title="L'application n'a pas pu démarrer"
            description="Une erreur a empêché le chargement de CarHorizontal. Nous vérifions si le problème vient de votre connexion ou de nos services."
            onRetry={() => unstable_retry()}
          />
        </div>
        {error.digest && (
          <p className="pb-6 text-center font-mono text-xs text-muted-foreground">
            Réf. {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
