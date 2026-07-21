"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  LogOut,
  Car,
  Phone,
  CalendarClock,
  Pencil,
  Info,
} from "lucide-react";
import {
  portalApi,
  apiErrorMessage,
  type PortalVehicle,
  type PortalMileageCapAlert,
  type PortalVehicleEvent,
} from "@/lib/api/portal";
import { tokenStore } from "@/lib/auth/tokens";
import { useBranding } from "@/lib/branding";
import { BrandMark, Button, GhostButton, Modal, SplashScreen } from "@/components/ui";
import { cn } from "@/lib/utils";

const shortDateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const numberFmt = new Intl.NumberFormat("fr-FR");

const SEVERITY_DOT: Record<string, string> = {
  Critical: "bg-danger",
  Recommended: "bg-warning",
};

export default function DashboardPage() {
  const router = useRouter();
  const { branding } = useBranding();
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

  if (!mounted) return <SplashScreen />;

  const firstName = profile.data?.fullName?.split(" ")[0];

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-5 pb-16 pt-8 sm:px-8">
      <header className="rise flex items-center justify-between">
        <BrandMark />
        <GhostButton onClick={logout} aria-label="Déconnexion">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </GhostButton>
      </header>

      <section className="mt-12">
        <p className="micro-label rise" style={{ "--d": "80ms" } as React.CSSProperties}>
          Votre espace personnel
        </p>
        <h1
          className="rise mt-3 font-display text-4xl text-ink sm:text-5xl"
          style={{ "--d": "160ms" } as React.CSSProperties}
        >
          Bonjour{firstName ? `, ${firstName}` : ""}
        </h1>
        <p
          className="rise mt-3 text-base text-ink-mute"
          style={{ "--d": "240ms" } as React.CSSProperties}
        >
          Voici l'état de {vehicles.data && vehicles.data.length > 1 ? "vos véhicules" : "votre véhicule"},
          suivi par {branding?.garageName ?? "votre garage"}.
        </p>
      </section>

      <section className="mt-10 flex flex-col gap-6">
        {vehicles.isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-ink-faint" />
          </div>
        ) : vehicles.isError ? (
          <p className="panel rise p-6 text-sm text-danger">
            Impossible de charger vos véhicules pour le moment.
          </p>
        ) : (vehicles.data?.length ?? 0) === 0 ? (
          <div className="panel rise flex flex-col items-center gap-3 p-12 text-center">
            <Car className="h-6 w-6 text-ink-faint" />
            <p className="text-base text-ink-mute">
              Aucun véhicule associé à votre compte pour l'instant.
            </p>
          </div>
        ) : (
          vehicles.data!.map((v, i) => <VehicleCard key={v.id} vehicle={v} index={i} />)
        )}
      </section>

      <ContactCard />

      <footer className="rise mt-14 text-center text-xs tracking-wide text-ink-faint">
        Espace client propulsé par CarHorizontal
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Carte véhicule                                                     */
/* ------------------------------------------------------------------ */

function VehicleCard({ vehicle, index }: { vehicle: PortalVehicle; index: number }) {
  return (
    <article
      className="panel rise overflow-hidden"
      style={{ "--d": `${320 + index * 110}ms` } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-5 p-6 sm:p-8">
        <div className="min-w-0">
          <p className="micro-label">Véhicule</p>
          <h2 className="mt-2 font-display text-3xl text-ink">
            {vehicle.make} <span className="text-ink-mute">{vehicle.model}</span>
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {vehicle.licensePlate && <PlateChip plate={vehicle.licensePlate} />}
            {vehicle.year && (
              <span className="text-xs tracking-wide text-ink-mute">{vehicle.year}</span>
            )}
          </div>
        </div>

        <MileagePanel vehicle={vehicle} />
      </div>

      {vehicle.mileageCapAlert && <MileageCapSection alert={vehicle.mileageCapAlert} />}

      <UpcomingEvents events={vehicle.upcomingEvents} />
    </article>
  );
}

/** Plaque d'immatriculation stylisée, clin d'œil aux plaques françaises. */
function PlateChip({ plate }: { plate: string }) {
  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-md border border-line text-[11px] font-semibold tracking-[0.14em]">
      <span className="w-1.5 bg-brand/70" aria-hidden />
      <span className="bg-panel-soft px-2.5 py-1 uppercase text-ink">{plate}</span>
    </span>
  );
}

function MileagePanel({ vehicle }: { vehicle: PortalVehicle }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-right">
      <p className="micro-label">Kilométrage</p>
      <p className="tnum mt-1 font-display text-3xl text-ink">
        {numberFmt.format(vehicle.currentMileage)}
        <span className="ml-1.5 text-base text-ink-mute">km</span>
      </p>
      <button
        onClick={() => setOpen(true)}
        className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-brand transition-opacity hover:opacity-75"
      >
        <Pencil className="h-3.5 w-3.5" />
        Mettre à jour
      </button>
      <MileageDialog vehicle={vehicle} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/** Modale de déclaration du kilométrage, avec le pourquoi de la démarche. */
function MileageDialog({
  vehicle,
  open,
  onClose,
}: {
  vehicle: PortalVehicle;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(String(vehicle.currentMileage));
  const [error, setError] = useState<string | null>(null);

  // Repart d'un état propre à chaque ouverture.
  useEffect(() => {
    if (open) {
      setValue(String(vehicle.currentMileage));
      setError(null);
    }
  }, [open, vehicle.currentMileage]);

  const mutation = useMutation({
    mutationFn: (km: number) => portalApi.submitMileage(vehicle.id, km),
    onSuccess: async () => {
      onClose();
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
    <Modal open={open} onClose={onClose} title="Mettre à jour le kilométrage">
      <p className="text-base text-ink-mute">
        {vehicle.make} {vehicle.model}
        {vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ""}
      </p>

      <div className="mt-4 flex gap-3 rounded-xl border border-brand/25 bg-brand/10 p-4 text-left">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p className="text-sm leading-relaxed text-ink-mute">
          <span className="font-semibold text-ink">Pourquoi le déclarer ?</span>{" "}
          Un kilométrage à jour permet à votre garage de planifier vos entretiens
          au bon moment (vidange, pneus, révision) et de suivre le plafond de
          votre contrat de leasing — pour vous éviter des réparations évitables
          et des frais de dépassement.
        </p>
      </div>

      <label className="mt-5 block text-left">
        <span className="micro-label mb-2 block">Kilométrage actuel</span>
        <div className="relative">
          <input
            type="number"
            autoFocus
            min={vehicle.currentMileage}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className={cn(
              "tnum w-full rounded-xl border border-line bg-panel-soft px-4 py-3 pr-14 text-lg text-ink",
              "outline-none transition-[border-color,box-shadow] duration-200",
              "focus:border-brand/60 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_18%,transparent)]",
            )}
          />
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base text-ink-mute">
            km
          </span>
        </div>
        <span className="mt-2 block text-sm text-ink-faint">
          Dernière valeur connue : {numberFmt.format(vehicle.currentMileage)} km
          (le compteur ne peut pas reculer).
        </span>
      </label>

      {error && <p className="mt-3 text-left text-sm text-danger">{error}</p>}

      <div className="mt-6 flex gap-3">
        <GhostButton onClick={onClose} className="flex-1 justify-center py-3">
          Annuler
        </GhostButton>
        <Button onClick={save} pending={mutation.isPending} className="flex-1">
          Enregistrer
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Forfait kilométrique (leasing)                                     */
/* ------------------------------------------------------------------ */

function MileageCapSection({ alert }: { alert: PortalMileageCapAlert }) {
  const ratio = Math.min(1, alert.currentKm / alert.capKm);
  const tone = alert.exceeded ? "var(--color-danger)" : "var(--color-warning)";

  return (
    <div className="border-t border-line-soft px-6 py-5 sm:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <p className="micro-label">Forfait kilométrique — leasing</p>
        <p className="tnum text-sm text-ink-mute">
          <span style={{ color: tone }} className="font-semibold">
            {numberFmt.format(alert.currentKm)}
          </span>{" "}
          / {numberFmt.format(alert.capKm)} km
        </p>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line-soft">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${Math.round(ratio * 100)}%`, backgroundColor: tone }}
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-mute">
        {alert.exceeded ? (
          <>Le plafond de votre contrat est dépassé. </>
        ) : (
          <>
            À ce rythme, ≈ {numberFmt.format(alert.projectedKm)} km sont projetés à
            l'échéance du contrat.{" "}
          </>
        )}
        <span className="text-ink">
          Parlez-en à votre garage pour éviter des frais de dépassement.
        </span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Échéances                                                          */
/* ------------------------------------------------------------------ */

function UpcomingEvents({ events }: { events: PortalVehicleEvent[] }) {
  return (
    <div className="border-t border-line-soft px-6 py-5 sm:px-8">
      <p className="micro-label flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5" />
        Prochaines échéances
      </p>
      {events.length === 0 ? (
        <p className="mt-3 text-base text-ink-mute">
          Tout est à jour — aucun entretien à prévoir.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line-soft">
          {events.map((e, i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-2.5">
              <span className="flex min-w-0 items-center gap-3 text-base text-ink">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    SEVERITY_DOT[e.severity ?? ""] ?? "bg-brand",
                  )}
                />
                <span className="truncate">{e.title}</span>
              </span>
              {e.dueAt && (
                <time className="shrink-0 text-sm tracking-wide text-ink-mute">
                  {shortDateFmt.format(new Date(e.dueAt))}
                  <span className="text-ink-faint">
                    {" "}
                    {new Date(e.dueAt).getFullYear()}
                  </span>
                </time>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact garage                                                     */
/* ------------------------------------------------------------------ */

function ContactCard() {
  const { branding } = useBranding();

  return (
    <section
      className="panel rise mt-10 flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8"
      style={{ "--d": "560ms" } as React.CSSProperties}
    >
      <div className="min-w-0">
        <p className="micro-label">À votre service</p>
        <p className="mt-2 font-display text-xl text-ink">
          Une question ? {branding?.garageName ?? "Votre garage"} vous répond.
        </p>
        {branding?.tagline && (
          <p className="mt-1 text-sm text-ink-mute">{branding.tagline}</p>
        )}
      </div>
      {branding?.contactPhone && (
        <a
          href={`tel:${branding.contactPhone.replace(/\s/g, "")}`}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-ink",
            "transition-[transform,filter,box-shadow] duration-200 hover:-translate-y-px hover:brightness-110",
            "hover:shadow-[0_10px_28px_-10px_color-mix(in_oklab,var(--brand)_60%,transparent)]",
          )}
        >
          <Phone className="h-4 w-4" />
          {branding.contactPhone}
        </a>
      )}
    </section>
  );
}
