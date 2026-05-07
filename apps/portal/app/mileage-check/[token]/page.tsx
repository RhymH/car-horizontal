"use client";

import { use, useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { extractApiErrorMessage } from "@/lib/api/errors";

interface MileageCheckContext {
  organizationName: string;
  vehicleLabel: string;
  licensePlate: string;
  lastKnownMileage: number;
  lastKnownAt: string;
}

const numberFormatter = new Intl.NumberFormat("fr-FR");

export default function MileageCheckPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [context, setContext] = useState<MileageCheckContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mileage, setMileage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<MileageCheckContext>(`/api/public/mileage-check/${token}`)
      .then(({ data }) => {
        if (cancelled) return;
        setContext(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          extractApiErrorMessage(err, "Lien invalide ou expiré."),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    const parsed = Number(mileage.replace(/\s/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSubmitError("Veuillez saisir un kilométrage valide.");
      return;
    }
    if (parsed < context.lastKnownMileage) {
      setSubmitError(
        `La valeur doit être ≥ ${numberFormatter.format(
          context.lastKnownMileage,
        )} km.`,
      );
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiClient.post(`/api/public/mileage-check/${token}`, {
        mileage: parsed,
      });
      setDone(true);
    } catch (err) {
      setSubmitError(extractApiErrorMessage(err, "Envoi impossible."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-linear-to-br from-background via-background to-accent/40 px-6 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Wrench className="size-4" />
          </span>
          {context?.organizationName ?? "CarHorizontal"}
        </div>

        {loadError && (
          <div className="space-y-2 text-sm">
            <h1 className="text-xl font-semibold">Lien indisponible</h1>
            <p className="text-muted-foreground">{loadError}</p>
            <p className="text-muted-foreground">
              Contactez votre garage pour recevoir un nouveau lien.
            </p>
          </div>
        )}

        {!loadError && !context && (
          <div className="space-y-2">
            <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
          </div>
        )}

        {context && done && (
          <div className="space-y-3">
            <h1 className="text-xl font-semibold">Merci !</h1>
            <p className="text-sm text-muted-foreground">
              Nous avons bien enregistré votre kilométrage. Nous reviendrons
              vers vous au bon moment pour le prochain entretien.
            </p>
          </div>
        )}

        {context && !done && (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">
                Votre {context.vehicleLabel}
              </h1>
              <p className="text-sm text-muted-foreground">
                Plaque{" "}
                <span className="font-mono font-medium text-foreground">
                  {context.licensePlate}
                </span>
                . Dernier relevé connu :{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {numberFormatter.format(context.lastKnownMileage)} km
                </span>
                .
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Kilométrage actuel
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                min={context.lastKnownMileage}
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder={String(context.lastKnownMileage)}
                autoFocus
              />
              {submitError && (
                <span className="text-xs text-destructive">{submitError}</span>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Envoi…" : "Envoyer"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Vos coordonnées ne sont pas demandées : ce lien identifie déjà
              votre véhicule de manière sécurisée.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
