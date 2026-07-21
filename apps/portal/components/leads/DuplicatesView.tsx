"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  GitMerge,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/format";
import { leadsApi, type LeadDuplicateGroup } from "@/lib/api/leads";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import {
  customerStatusLabels,
  type CustomerStatus,
} from "@/lib/schemas/customer";

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const STATUS_TONE: Record<string, "success" | "neutral" | "danger" | "info"> = {
  Active: "success",
  Inactive: "neutral",
  Lost: "danger",
  Prospect: "info",
};

export function DuplicatesView() {
  const queryClient = useQueryClient();
  // groupKey -> id of the customer to keep
  const [primaryChoice, setPrimaryChoice] = useState<Record<string, string>>({});
  const [mergeTarget, setMergeTarget] = useState<LeadDuplicateGroup | null>(null);

  const duplicates = useQuery({
    queryKey: queryKeys.leads.duplicates(),
    queryFn: ({ signal }) => leadsApi.duplicates(signal),
  });

  const mergeMutation = useMutation({
    mutationFn: async (group: LeadDuplicateGroup) => {
      const primaryId =
        primaryChoice[groupKey(group)] ?? group.customers[0].id;
      const others = group.customers.filter((c) => c.id !== primaryId);
      let moved = 0;
      for (const dup of others) {
        const res = await leadsApi.merge(primaryId, dup.id);
        moved +=
          res.movedVehicles +
          res.movedInteractions +
          res.movedAppointments +
          res.movedFollowUps +
          res.movedOther;
      }
      return { merged: others.length, moved };
    },
    onSuccess: async ({ merged, moved }) => {
      toast.success(
        `${merged} fiche(s) fusionnée(s) — ${moved} élément(s) transféré(s).`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() }),
      ]);
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Fusion impossible.")),
  });

  const groups = duplicates.data ?? [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <Link
          href="/clients"
          className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Retour aux clients
        </Link>
      </div>
      <PageHeader
        title="Réconciliation des doublons"
        description="Fiches qui partagent le même téléphone ou le même email. La fusion transfère véhicules, historique et relances vers la fiche conservée, complète ses champs vides, et archive l'autre — rien n'est perdu."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicates.refetch()}
            disabled={duplicates.isFetching}
          >
            <RefreshCw className={cn(duplicates.isFetching && "animate-spin")} />
            Réanalyser
          </Button>
        }
      />

      {duplicates.isLoading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Aucun doublon détecté"
          description="Aucune fiche ne partage de téléphone ou d'email avec une autre. Revenez après un import pour vérifier."
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const key = groupKey(group);
            const primaryId = primaryChoice[key] ?? group.customers[0].id;
            return (
              <section
                key={key}
                className="rounded-xl border border-border bg-card shadow-sm"
              >
                <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    {group.matchType === "Phone" ? (
                      <Phone className="size-3.5" />
                    ) : (
                      <Mail className="size-3.5" />
                    )}
                  </span>
                  <p className="text-sm">
                    <span className="font-medium">
                      {group.matchType === "Phone"
                        ? "Même téléphone"
                        : "Même email"}
                    </span>
                    <span className="text-muted-foreground">
                      {" — "}
                      {group.matchType === "Phone"
                        ? formatPhone(group.value)
                        : group.value}
                    </span>
                  </p>
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={() => setMergeTarget(group)}
                    disabled={mergeMutation.isPending}
                  >
                    <GitMerge />
                    Fusionner
                  </Button>
                </header>
                <div
                  className={cn(
                    "grid gap-3 p-4",
                    group.customers.length > 2
                      ? "sm:grid-cols-3"
                      : "sm:grid-cols-2",
                  )}
                >
                  {group.customers.map((c) => {
                    const isPrimary = c.id === primaryId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setPrimaryChoice((prev) => ({ ...prev, [key]: c.id }))
                        }
                        className={cn(
                          "flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
                          isPrimary
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{c.fullName}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              isPrimary
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {isPrimary ? "À conserver" : "Sera fusionnée"}
                          </span>
                        </div>
                        <dl className="space-y-1 text-sm text-muted-foreground">
                          <DupRow
                            label="Téléphone"
                            value={c.phone ? formatPhone(c.phone) : null}
                          />
                          <DupRow label="Email" value={c.email} />
                          <DupRow
                            label="Adresse"
                            value={
                              [c.address, c.postalCode, c.city]
                                .filter(Boolean)
                                .join(", ") || null
                            }
                          />
                          <DupRow
                            label="Créée le"
                            value={dateFmt.format(new Date(c.createdAt))}
                          />
                        </dl>
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                          <StatusBadge tone={STATUS_TONE[c.status] ?? "neutral"}>
                            {customerStatusLabels[c.status as CustomerStatus] ??
                              c.status}
                          </StatusBadge>
                          <span className="inline-flex items-center gap-1">
                            <Car className="size-3.5" />
                            {c.vehicleCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="size-3.5" />
                            {c.interactionCount}
                          </span>
                          <Link
                            href={`/clients/${c.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-auto text-primary underline-offset-2 hover:underline"
                          >
                            Voir la fiche
                          </Link>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={mergeTarget !== null}
        onOpenChange={(o) => !o && setMergeTarget(null)}
        title="Fusionner ces fiches ?"
        description={
          mergeTarget
            ? `Les véhicules, interactions, rendez-vous et relances des ${
                mergeTarget.customers.length - 1 > 1
                  ? "fiches fusionnées"
                  : "autres fiches"
              } seront transférés vers « ${
                mergeTarget.customers.find(
                  (c) =>
                    c.id ===
                    (primaryChoice[groupKey(mergeTarget)] ??
                      mergeTarget.customers[0].id),
                )?.fullName
              } ». Ses champs vides seront complétés, rien n'est écrasé. Cette action est définitive.`
            : undefined
        }
        confirmLabel="Fusionner"
        onConfirm={async () => {
          if (!mergeTarget) return;
          await mergeMutation.mutateAsync(mergeTarget);
          setMergeTarget(null);
        }}
      />
    </div>
  );
}

function groupKey(group: LeadDuplicateGroup): string {
  return `${group.matchType}:${group.value}`;
}

function DupRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-xs uppercase tracking-wide">{label}</dt>
      <dd className={cn("min-w-0 truncate", !value && "italic")}>
        {value ?? "—"}
      </dd>
    </div>
  );
}
