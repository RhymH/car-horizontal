"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  clients: "Clients",
  vehicles: "Véhicules",
  timeline: "Timeline",
  reminders: "Rappels",
  appointments: "Rendez-vous",
  history: "Historique",
  loyalty: "Fidélisation",
  settings: "Paramètres",
  profile: "Profil",
};

function label(segment: string) {
  return LABELS[segment] ?? segment;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="hidden items-center gap-1 text-sm text-muted-foreground md:flex"
    >
      {segments.map((segment, idx) => {
        const href = "/" + segments.slice(0, idx + 1).join("/");
        const isLast = idx === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="size-3.5" />}
            {isLast ? (
              <span className="font-medium text-foreground">
                {label(segment)}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {label(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
