"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { customersApi } from "@/lib/api/customers";
import { vehiclesApi } from "@/lib/api/vehicles";
import { queryKeys } from "@/lib/query/keys";

const LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  clients: "Clients",
  prospects: "Prospects",
  vehicles: "Véhicules",
  timeline: "Timeline",
  reminders: "Rappels",
  appointments: "Rendez-vous",
  history: "Historique",
  loyalty: "Fidélisation",
  notifications: "Notifications",
  settings: "Paramètres",
  profile: "Profil",
  import: "Import",
  doublons: "Doublons",
  stats: "Statistiques",
};

const ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function label(segment: string) {
  return LABELS[segment] ?? segment;
}

/** Id de l'élément affiché sur `/<section>/<id>`, sinon null. */
function detailId(segments: string[], section: string) {
  if (segments[0] !== section || segments.length < 2) return null;
  return ID_PATTERN.test(segments[1]) ? segments[1] : null;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const customerId = detailId(segments, "clients");
  const vehicleId = detailId(segments, "vehicles");

  // Mêmes clés que les vues détail : la requête est dédupliquée, pas d'appel en plus.
  const customer = useQuery({
    queryKey: queryKeys.customers.detail(customerId ?? ""),
    queryFn: ({ signal }) => customersApi.get(customerId!, signal),
    enabled: customerId !== null,
    staleTime: 60_000,
  });
  const vehicle = useQuery({
    queryKey: queryKeys.vehicles.detail(vehicleId ?? ""),
    queryFn: ({ signal }) => vehiclesApi.get(vehicleId!, signal),
    enabled: vehicleId !== null,
    staleTime: 60_000,
  });

  if (segments.length === 0) return null;

  const entityName = customerId
    ? customer.data?.fullName
    : vehicleId
      ? vehicle.data
        ? [
            `${vehicle.data.make} ${vehicle.data.model}`.trim(),
            vehicle.data.licensePlate,
          ]
            .filter(Boolean)
            .join(" · ")
        : undefined
      : undefined;
  const entityLoading = customerId
    ? customer.isPending
    : vehicleId
      ? vehicle.isPending
      : false;

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="hidden items-center gap-1 text-sm text-muted-foreground md:flex"
    >
      {segments.map((segment, idx) => {
        const href = "/" + segments.slice(0, idx + 1).join("/");
        const isLast = idx === segments.length - 1;
        const isEntity = idx === 1 && (customerId !== null || vehicleId !== null);
        const text = isEntity
          ? (entityName ?? (entityLoading ? "…" : label(segment)))
          : label(segment);
        return (
          <span key={href} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="size-3.5" />}
            {isLast ? (
              <span className="font-medium text-foreground">{text}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {text}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
