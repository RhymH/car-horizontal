import type { SaleStatusApi } from "@/lib/api/sales";
import type { StatusTone } from "@/components/ui/StatusBadge";

export const currencyFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const numberFmt = new Intl.NumberFormat("fr-FR");

export const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function money(value: number | null | undefined): string {
  return value == null ? "—" : currencyFmt.format(value);
}

export function shortDate(value: string | null | undefined): string {
  return value ? dateFmt.format(new Date(value)) : "—";
}

/** "2026-07-31T…" → "2026-07-31", pour les <input type="date">. */
export function toDateInput(value: string | null | undefined): string {
  return value ? value.substring(0, 10) : "";
}

/** "2026-07-31" → ISO minuit UTC ; vide → null. */
export function dateInputToIso(value: string | undefined): string | null {
  return value ? new Date(`${value}T00:00:00Z`).toISOString() : null;
}

export const SALE_STATUS_TONE: Record<SaleStatusApi, StatusTone> = {
  Draft: "neutral",
  ForSale: "success",
  Reserved: "warning",
  Sold: "info",
  Withdrawn: "neutral",
};

/** Poids lisible d'un fichier (les photos sont affichées en Ko/Mo). */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
