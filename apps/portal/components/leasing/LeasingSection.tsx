"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowActions } from "@/components/ui/RowActions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeasingFormDialog, type LeasingFormMode } from "@/components/leasing/LeasingFormDialog";
import { useCapability } from "@/lib/hooks/useCapabilities";
import { CAPABILITY_LEASING } from "@/lib/api/capabilities";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import {
  leasingApi,
  leasingStatusLabels,
  type LeasingContract,
  type LeasingStatusApi,
} from "@/lib/api/leasing";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" });
const numberFmt = new Intl.NumberFormat("fr-FR");
const currencyFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

const STATUS_BADGE: Record<LeasingStatusApi, string> = {
  Active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Ended: "bg-muted text-muted-foreground",
  Cancelled: "bg-destructive/10 text-destructive",
};

export function LeasingSection({ vehicleId }: { vehicleId: string }) {
  const queryClient = useQueryClient();
  const { enabled } = useCapability(CAPABILITY_LEASING);

  const [dialog, setDialog] = useState<LeasingFormMode | null>(null);
  const [toDelete, setToDelete] = useState<LeasingContract | null>(null);

  const list = useQuery({
    queryKey: queryKeys.leasing.byVehicle(vehicleId),
    queryFn: ({ signal }) => leasingApi.list({ vehicleId }, signal),
    enabled, // ne déclenche l'appel que si le plugin est actif
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leasingApi.remove(id),
    onSuccess: async () => {
      toast.success("Contrat supprimé");
      await queryClient.invalidateQueries({ queryKey: queryKeys.leasing.byVehicle(vehicleId) });
      setToDelete(null);
    },
    onError: (e) => toast.error(extractApiErrorMessage(e, "Suppression impossible.")),
  });

  // Plugin désactivé pour l'organisation → la section n'existe pas.
  if (!enabled) return null;

  const contracts = list.data?.items ?? [];

  return (
    <>
      <SectionCard
        title="Leasing"
        description={
          contracts.length === 0 ? "Aucun contrat" : `${contracts.length} contrat(s)`
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => setDialog({ kind: "create", vehicleId })}>
            <Plus />
            Nouveau contrat
          </Button>
        }
      >
        {contracts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun contrat de leasing"
            description="Ajoutez un contrat pour suivre l'échéance et le plafond kilométrique."
            action={
              <Button size="sm" onClick={() => setDialog({ kind: "create", vehicleId })}>
                Ajouter un contrat
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Bailleur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden sm:table-cell">Période</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Plafond km</TableHead>
                  <TableHead className="text-right">Mensualité</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.lessor}
                      {c.reference && (
                        <span className="block text-xs text-muted-foreground">{c.reference}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_BADGE[c.status])}>
                        {leasingStatusLabels[c.status]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell whitespace-nowrap text-sm text-muted-foreground">
                      {dateFmt.format(new Date(c.startDate))} → {dateFmt.format(new Date(c.endDate))}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums text-muted-foreground">
                      {c.mileageCapKm != null ? `${numberFmt.format(c.mileageCapKm)} km` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.monthlyPayment != null ? currencyFmt.format(c.monthlyPayment) : "—"}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        actions={[
                          {
                            label: "Modifier",
                            icon: <Pencil className="size-4" />,
                            onSelect: () => setDialog({ kind: "edit", contract: c }),
                          },
                          {
                            label: "Supprimer",
                            icon: <Trash2 className="size-4" />,
                            onSelect: () => setToDelete(c),
                            variant: "destructive",
                            separatorBefore: true,
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {dialog && (
        <LeasingFormDialog
          open={dialog !== null}
          onOpenChange={(o) => !o && setDialog(null)}
          mode={dialog}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce contrat de leasing ?"
        description={
          toDelete ? `Le contrat ${toDelete.lessor} sera supprimé.` : undefined
        }
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={async () => {
          if (toDelete) await deleteMutation.mutateAsync(toDelete.id);
        }}
      />
    </>
  );
}
