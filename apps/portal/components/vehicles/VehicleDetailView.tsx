"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  vehiclesApi,
  type VehicleMaintenance,
  type VehicleTimelineEvent,
} from "@/lib/api/vehicles";
import {
  maintenanceApi,
  type MaintenanceRecord,
  type MaintenanceTypeApi,
} from "@/lib/api/maintenance";
import { timelineApi } from "@/lib/api/timeline";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { SnoozeTimelineDialog } from "@/components/timeline/SnoozeTimelineDialog";
import { VehicleHeader } from "@/components/vehicles/VehicleHeader";
import { VehicleSummaryCard } from "@/components/vehicles/VehicleSummaryCard";
import { VehicleTimelineSection } from "@/components/vehicles/VehicleTimelineSection";
import { VehicleMaintenanceSection } from "@/components/vehicles/VehicleMaintenanceSection";
import { VehicleFormDialog } from "@/components/vehicles/VehicleFormDialog";
import { UpdateMileageDialog } from "@/components/vehicles/UpdateMileageDialog";
import { MaintenanceFormDialog } from "@/components/maintenance/MaintenanceFormDialog";

export function VehicleDetailView({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mileageOpen, setMileageOpen] = useState(false);
  const [maintenanceDialog, setMaintenanceDialog] = useState<
    | { kind: "create" }
    | { kind: "edit"; record: MaintenanceRecord }
    | null
  >(null);
  const [maintenanceToDelete, setMaintenanceToDelete] =
    useState<MaintenanceRecord | null>(null);
  const [snoozeTarget, setSnoozeTarget] = useState<VehicleTimelineEvent | null>(
    null,
  );

  const detail = useQuery({
    queryKey: queryKeys.vehicles.detail(vehicleId),
    queryFn: ({ signal }) => vehiclesApi.get(vehicleId, signal),
  });

  const deleteMutation = useMutation({
    mutationFn: () => vehiclesApi.remove(vehicleId),
    onSuccess: async () => {
      toast.success("Véhicule supprimé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.all(),
      });
      router.push("/vehicles");
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Suppression impossible.")),
  });

  const completeTimelineMutation = useMutation({
    mutationFn: (id: string) => timelineApi.complete(id),
    onSuccess: async () => {
      toast.success("Événement marqué comme fait");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.vehicles.detail(vehicleId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all() }),
      ]);
    },
    onError: (e) => toast.error(extractApiErrorMessage(e, "Action impossible.")),
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: (id: string) => maintenanceApi.remove(id),
    onSuccess: async () => {
      toast.success("Entretien supprimé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.detail(vehicleId),
      });
      setMaintenanceToDelete(null);
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Suppression impossible.")),
  });

  const toMaintenanceRecord = (
    m: VehicleMaintenance,
  ): MaintenanceRecord => ({
    id: m.id,
    vehicleId,
    performedAt: m.performedAt,
    type: m.type as MaintenanceTypeApi,
    description: m.description,
    mileageAtService: m.mileageAtService,
    cost: m.cost,
    mechanicName: m.mechanicName,
    nextDueAt: m.nextDueAt,
    nextDueMileage: m.nextDueMileage,
    createdAt: m.performedAt,
    updatedAt: m.performedAt,
  });

  if (detail.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Véhicule introuvable ou indisponible.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/vehicles")}
        >
          Retour aux véhicules
        </Button>
      </div>
    );
  }

  const vehicle = detail.data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <VehicleHeader
        vehicle={vehicle}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onUpdateMileage={() => setMileageOpen(true)}
        onAddMaintenance={() => setMaintenanceDialog({ kind: "create" })}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <VehicleSummaryCard vehicle={vehicle} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <VehicleTimelineSection
            events={vehicle.timelineEvents}
            onMarkDone={(e) => completeTimelineMutation.mutate(e.id)}
            onSnooze={(e) => setSnoozeTarget(e)}
            onSendReminder={() =>
              toast.info("L'envoi de rappel sera disponible avec la Phase 8.")
            }
          />
          <VehicleMaintenanceSection
            records={vehicle.maintenanceRecords}
            onAdd={() => setMaintenanceDialog({ kind: "create" })}
            onEdit={(r) =>
              setMaintenanceDialog({
                kind: "edit",
                record: toMaintenanceRecord(r),
              })
            }
            onDelete={(r) => setMaintenanceToDelete(toMaintenanceRecord(r))}
          />
        </div>
      </div>

      <VehicleFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode={{ kind: "edit", vehicle }}
      />

      <UpdateMileageDialog
        open={mileageOpen}
        onOpenChange={setMileageOpen}
        vehicle={vehicle}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer ce véhicule ?"
        description={`« ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate}) » sera supprimé. Son historique d'entretien restera consultable.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />

      {maintenanceDialog && (
        <MaintenanceFormDialog
          open={!!maintenanceDialog}
          onOpenChange={(o) => {
            if (!o) setMaintenanceDialog(null);
          }}
          vehicleId={vehicle.id}
          vehicleCustomerId={vehicle.customerId}
          vehicleCurrentMileage={vehicle.currentMileage}
          mode={maintenanceDialog}
        />
      )}

      <SnoozeTimelineDialog
        open={snoozeTarget !== null}
        onOpenChange={(o) => !o && setSnoozeTarget(null)}
        event={snoozeTarget}
      />

      <ConfirmDialog
        open={!!maintenanceToDelete}
        onOpenChange={(o) => {
          if (!o) setMaintenanceToDelete(null);
        }}
        title="Supprimer cet entretien ?"
        description="L'intervention et l'éventuel événement timeline associé seront supprimés."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={async () => {
          if (maintenanceToDelete) {
            await deleteMaintenanceMutation.mutateAsync(
              maintenanceToDelete.id,
            );
          }
        }}
      />
    </div>
  );
}
