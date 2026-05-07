"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { vehiclesApi } from "@/lib/api/vehicles";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { VehicleHeader } from "@/components/vehicles/VehicleHeader";
import { VehicleSummaryCard } from "@/components/vehicles/VehicleSummaryCard";
import { VehicleTimelineSection } from "@/components/vehicles/VehicleTimelineSection";
import { VehicleMaintenanceSection } from "@/components/vehicles/VehicleMaintenanceSection";
import { VehicleFormDialog } from "@/components/vehicles/VehicleFormDialog";
import { UpdateMileageDialog } from "@/components/vehicles/UpdateMileageDialog";

export function VehicleDetailView({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mileageOpen, setMileageOpen] = useState(false);

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
        onAddMaintenance={() =>
          toast.info(
            "Création d'entretien disponible dans la Phase 6 (T061).",
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <VehicleSummaryCard vehicle={vehicle} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <VehicleTimelineSection
            events={vehicle.timelineEvents}
            onMarkDone={() =>
              toast.info("Disponible dès l'activation du module Timeline.")
            }
            onSnooze={() =>
              toast.info("Disponible dès l'activation du module Timeline.")
            }
            onSendReminder={() =>
              toast.info("Disponible dès l'activation du module Messaging.")
            }
          />
          <VehicleMaintenanceSection
            records={vehicle.maintenanceRecords}
            onAdd={() =>
              toast.info(
                "Création d'entretien disponible dans la Phase 6 (T061).",
              )
            }
            onEdit={() =>
              toast.info("Édition d'entretien disponible dans la Phase 6.")
            }
            onDelete={() =>
              toast.info(
                "Suppression d'entretien disponible dans la Phase 6.",
              )
            }
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
    </div>
  );
}
