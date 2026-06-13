"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LogOut, Car, CalendarClock, Gauge } from "lucide-react";
import { portalApi, type PortalVehicle } from "@/lib/api/portal";
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

  useEffect(() => {
    if (!tokenStore.getAccessToken()) router.replace("/login");
  }, [router]);

  const profile = useQuery({
    queryKey: ["portal", "me"],
    queryFn: ({ signal }) => portalApi.getProfile(signal),
  });
  const vehicles = useQuery({
    queryKey: ["portal", "vehicles"],
    queryFn: ({ signal }) => portalApi.getVehicles(signal),
  });

  function logout() {
    tokenStore.clear();
    router.replace("/login");
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Bonjour</p>
          <h1 className="text-xl font-semibold tracking-tight">
            {profile.data?.fullName ?? tokenStore.get()?.fullName ?? "…"}
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
          <div className="flex items-center justify-end gap-1 text-sm font-medium">
            <Gauge className="h-4 w-4 text-muted" />
            {numberFmt.format(vehicle.currentMileage)} km
          </div>
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
