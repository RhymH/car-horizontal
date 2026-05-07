"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AsyncButton } from "@/components/ui/AsyncButton";
import { vehiclesApi, type VehicleDetail } from "@/lib/api/vehicles";
import {
  vehicleFormSchema,
  type VehicleFormValues,
} from "@/lib/schemas/vehicle";
import { queryKeys } from "@/lib/query/keys";
import { VehicleForm } from "@/components/vehicles/VehicleForm";
import { extractApiErrorMessage } from "@/lib/api/errors";

type Mode =
  | { kind: "create"; defaultCustomerId?: string; defaultCustomerLabel?: string }
  | { kind: "edit"; vehicle: VehicleDetail };

export interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  onSaved?: (vehicle: VehicleDetail) => void;
}

const CURRENT_YEAR = new Date().getFullYear();

function buildDefaults(defaultCustomerId?: string): VehicleFormValues {
  return {
    customerId: defaultCustomerId ?? "",
    make: "",
    model: "",
    year: CURRENT_YEAR,
    licensePlate: "",
    vin: "",
    color: "",
    engineType: "Gasoline",
    transmissionType: undefined,
    purchasedAt: "",
    currentMileage: 0,
    vehicleModelId: null,
    selectedProgramId: null,
    vehicleModelLabel: null,
  };
}

function toFormValues(v: VehicleDetail): VehicleFormValues {
  return {
    customerId: v.customerId,
    make: v.make,
    model: v.model,
    year: v.year,
    licensePlate: v.licensePlate,
    vin: v.vin ?? "",
    color: v.color ?? "",
    engineType: v.engineType,
    transmissionType: v.transmissionType ?? undefined,
    purchasedAt: v.purchasedAt ? v.purchasedAt.slice(0, 10) : "",
    currentMileage: v.currentMileage,
    vehicleModelId: v.vehicleModelId,
    selectedProgramId: v.selectedProgramId,
    vehicleModelLabel: v.vehicleModelDisplayName,
  };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const t = value.trim();
  return t.length === 0 ? undefined : t;
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  mode,
  onSaved,
}: VehicleFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = mode.kind === "edit";

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: buildDefaults(
      mode.kind === "create" ? mode.defaultCustomerId : undefined,
    ),
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      form.reset(toFormValues(mode.vehicle));
    } else {
      form.reset(buildDefaults(mode.defaultCustomerId));
    }
  }, [open, isEdit, mode, form]);

  const mutation = useMutation({
    mutationFn: async (values: VehicleFormValues) => {
      const purchasedAt = values.purchasedAt
        ? new Date(values.purchasedAt).toISOString()
        : undefined;

      if (isEdit) {
        const previousModelId = mode.vehicle.vehicleModelId;
        return vehiclesApi.update(mode.vehicle.id, {
          customerId: values.customerId,
          make: values.make.trim(),
          model: values.model.trim(),
          year: values.year,
          licensePlate: values.licensePlate.trim().toUpperCase(),
          vin: emptyToUndefined(values.vin),
          color: emptyToUndefined(values.color),
          engineType: values.engineType,
          transmissionType: emptyToUndefined(values.transmissionType),
          purchasedAt,
          vehicleModelId: values.vehicleModelId ?? undefined,
          selectedProgramId: values.selectedProgramId ?? undefined,
          clearVehicleModel: !values.vehicleModelId && !!previousModelId,
        });
      }
      return vehiclesApi.create({
        customerId: values.customerId,
        make: values.make.trim(),
        model: values.model.trim(),
        year: values.year,
        licensePlate: values.licensePlate.trim().toUpperCase(),
        vin: emptyToUndefined(values.vin),
        color: emptyToUndefined(values.color),
        engineType: values.engineType,
        transmissionType: emptyToUndefined(values.transmissionType),
        purchasedAt,
        currentMileage: values.currentMileage,
        vehicleModelId: values.vehicleModelId ?? undefined,
        selectedProgramId: values.selectedProgramId ?? undefined,
      });
    },
    onSuccess: async (saved) => {
      toast.success(isEdit ? "Véhicule mis à jour" : "Véhicule créé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.all(),
      });
      if (isEdit) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.vehicles.detail(saved.id),
        });
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(saved.customerId),
      });
      onSaved?.(saved);
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(extractApiErrorMessage(error, "Une erreur est survenue."));
    },
  });

  const submit = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    await mutation.mutateAsync(form.getValues());
  };

  const lockCustomer = mode.kind === "create" && !!mode.defaultCustomerId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-180">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le véhicule" : "Nouveau véhicule"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour les informations de ce véhicule."
              : "Ajoutez un véhicule à un client existant."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4"
        >
          <VehicleForm
            register={form.register}
            control={form.control}
            watch={form.watch}
            setValue={form.setValue}
            errors={form.formState.errors}
            customerLocked={lockCustomer}
            initialCustomerLabel={
              isEdit ? mode.vehicle.customerFullName : mode.defaultCustomerLabel
            }
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Annuler
            </Button>
            <AsyncButton type="submit" onClick={submit}>
              {isEdit ? "Enregistrer" : "Créer"}
            </AsyncButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
