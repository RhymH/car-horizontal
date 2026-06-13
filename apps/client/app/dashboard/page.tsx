"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, Car, CalendarClock, Gauge, Check, X } from "lucide-react";
import { portalApi, apiErrorMessage, type PortalVehicle } from "@/lib/api/portal";
import { tokenStore } from "@/lib/auth/tokens";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const numberFmt = new Intl.NumberFormat("fr-FR");

const SEVERITY_DOT: Record<string, string> = {
  Critical: "bg-destructive",
  Recommended: "bg-warning",
  Optional: "bg-muted",
};

export default function DashboardPage() {
  const router = useRouter();
  // Garde de montage : évite tout mismatch d'hydratation lié au localStorage.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (!tokenStore.getAccessToken()) router.replace("/login");
  }, [router]);

  const profile = useQuery({
    queryKey: ["portal", "me"],
    queryFn: ({ signal }) => portalApi.getProfile(signal),
    enabled: mounted,
  });
  const vehicles = useQuery({
    queryKey: ["portal", "vehicles"],
    queryFn: ({ signal }) => portalApi.getVehicles(signal),
    enabled: mounted,
  });

  function logout() {
    tokenStore.clear();
    router.replace("/login");
  }

  if (!mounted) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Bonjour</p>
          <h1 className="text-xl font-semibold tracking-tight">
            {profile.data?.fullName ?? "…"}
          </h1>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </header>

      {vehicles.isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      ) : vehicles.isError ? (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-destructive">
          Impossible de charger vos véhicules pour le moment.
        </p>
      ) : (vehicles.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
          <Car className="mx-auto mb-2 h-6 w-6" />
          Aucun véhicule associé à votre compte pour l'instant.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {vehicles.data!.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      )}
    </main>
  );
}

function VehicleCard({ vehicle }: { vehicle: PortalVehicle }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(vehicle.currentMileage));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (km: number) => portalApi.submitMileage(vehicle.id, km),
    onSuccess: async () => {
      setEditing(false);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["portal", "vehicles"] });
    },
    onError: (e) => setError(apiErrorMessage(e, "Mise à jour impossible.")),
  });

  function save() {
    const km = Number(value);
    if (!Number.isFinite(km) || km <= 0) {
      setError("Saisissez un kilométrage valide.");
      return;
    }
    mutation.mutate(km);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Car className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">
              {vehicle.make} {vehicle.model}
              {vehicle.year ? <span className="text-muted"> · {vehicle.year}</span> : null}
            </h2>
            {vehicle.licensePlate && (
              <p className="text-xs uppercase tracking-wide text-muted">{vehicle.licensePlate}</p>
            )}
          </div>
        </div>

        <div className="text-right">
          {editing ? (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  autoFocus
                  min={vehicle.currentMileage}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-sm text-muted">km</span>
                <button
                  onClick={save}
                  disabled={mutation.isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-60"
                  aria-label="Enregistrer"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                    setValue(String(vehicle.currentMileage));
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted"
                  aria-label="Annuler"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {error && <span className="max-w-[12rem] text-xs text-destructive">{error}</span>}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-end gap-1 text-sm font-medium">
                <Gauge className="h-4 w-4 text-muted" />
                {numberFmt.format(vehicle.currentMileage)} km
              </div>
              <button
                onClick={() => setEditing(true)}
                className="mt-1 text-xs text-primary hover:underline"
              >
                Mettre à jour
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-5">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          <CalendarClock className="h-3.5 w-3.5" />
          Prochaines échéances
        </p>
        {vehicle.upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted">Rien de prévu — tout est à jour ✅</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {vehicle.upcomingEvents.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      SEVERITY_DOT[e.severity ?? ""] ?? "bg-primary",
                    )}
                  />
                  {e.title}
                </span>
                {e.dueAt && (
                  <span className="shrink-0 text-xs text-muted">
                    {dateFmt.format(new Date(e.dueAt))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
