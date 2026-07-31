import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConnectionDiagnostics } from "@/components/system/ConnectionDiagnostics";

export const metadata: Metadata = {
  title: "Diagnostic de connexion — CarHorizontal",
  description:
    "Vérifie votre connexion internet et la disponibilité des services CarHorizontal.",
};

/**
 * Page publique, sans authentification : reste accessible quand l'API est
 * tombée. C'est l'adresse à donner au téléphone (« allez sur /diagnostic »).
 */
export default function DiagnosticPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Diagnostic de connexion
      </h1>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
        Ce test vérifie, dans l&apos;ordre : votre accès internet, la
        disponibilité du site CarHorizontal, puis celle de nos services de
        données. Il indique de quel côté se situe le problème.
      </p>

      <ConnectionDiagnostics className="mt-8" />

      <div className="mt-8 border-t border-border pt-4">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          Retour au tableau de bord
        </Button>
      </div>
    </main>
  );
}
