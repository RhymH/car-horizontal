"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import {
  leasingApi,
  leasingStatusLabels,
  leasingStatuses,
  type LeasingContract,
  type LeasingStatusApi,
} from "@/lib/api/leasing";
import { leasingFormSchema, type LeasingFormValues } from "@/lib/schemas/leasing";

export type LeasingFormMode =
  | { kind: "create"; vehicleId: string }
  | { kind: "edit"; contract: LeasingContract };

export interface LeasingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: LeasingFormMode;
}

/** "yyyy-MM-dd" -> ISO (minuit UTC) ; vide -> chaîne vide. */
function dateToIso(value: string): string {
  return value ? new Date(`${value}T00:00:00Z`).toISOString() : "";
}

function buildDefaults(mode: LeasingFormMode): LeasingFormValues {
  if (mode.kind === "edit") {
    const c = mode.contract;
    return {
      lessor: c.lessor,
      reference: c.reference ?? "",
      monthlyPayment: c.monthlyPayment,
      startDate: c.startDate.substring(0, 10),
      endDate: c.endDate.substring(0, 10),
      mileageCapKm: c.mileageCapKm,
      buyoutValue: c.buyoutValue,
      notes: c.notes ?? "",
    };
  }
  return {
    lessor: "",
    reference: "",
    monthlyPayment: null,
    startDate: "",
    endDate: "",
    mileageCapKm: null,
    buyoutValue: null,
    notes: "",
  };
}

export function LeasingFormDialog({ open, onOpenChange, mode }: LeasingFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = mode.kind === "edit";
  const vehicleId = mode.kind === "edit" ? mode.contract.vehicleId : mode.vehicleId;

  // Le statut n'existe qu'en édition : géré hors RHF (le schéma ne le porte pas).
  const [status, setStatus] = useState<LeasingStatusApi>(
    mode.kind === "edit" ? mode.contract.status : "Active",
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeasingFormValues>({
    resolver: zodResolver(leasingFormSchema),
    defaultValues: buildDefaults(mode),
  });

  // Réinitialise le formulaire à chaque ouverture / changement de cible.
  useEffect(() => {
    if (!open) return;
    reset(buildDefaults(mode));
    setStatus(mode.kind === "edit" ? mode.contract.status : "Active");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const mutation = useMutation({
    mutationFn: (values: LeasingFormValues) => {
      const payload = {
        lessor: values.lessor.trim(),
        reference: values.reference?.trim() || undefined,
        monthlyPayment: values.monthlyPayment ?? undefined,
        startDate: dateToIso(values.startDate),
        endDate: dateToIso(values.endDate),
        mileageCapKm: values.mileageCapKm ?? undefined,
        buyoutValue: values.buyoutValue ?? undefined,
        notes: values.notes?.trim() || undefined,
      };
      return mode.kind === "edit"
        ? leasingApi.update(mode.contract.id, { ...payload, status })
        : leasingApi.create({ vehicleId, ...payload });
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Contrat mis à jour" : "Contrat de leasing créé");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leasing.byVehicle(vehicleId) }),
        // La création/màj régénère la timeline du véhicule → rafraîchir la fiche.
        queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.detail(vehicleId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() }),
      ]);
      onOpenChange(false);
    },
    onError: (e) => toast.error(extractApiErrorMessage(e, "Enregistrement impossible.")),
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  const numberSetter = (name: "monthlyPayment" | "mileageCapKm" | "buyoutValue") =>
    register(name, {
      setValueAs: (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Modifier le contrat de leasing" : "Nouveau contrat de leasing"}
      submitLabel={isEdit ? "Enregistrer" : "Créer"}
      pending={mutation.isPending}
      onSubmit={onSubmit}
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bailleur *" error={errors.lessor?.message} span={2}>
          <Input {...register("lessor")} placeholder="DIAC, Arval…" />
        </Field>

        <Field label="Référence" error={errors.reference?.message}>
          <Input {...register("reference")} placeholder="N° de contrat" />
        </Field>

        <Field label="Mensualité (€)" error={errors.monthlyPayment?.message}>
          <Input type="number" step="0.01" min={0} {...numberSetter("monthlyPayment")} placeholder="349.90" />
        </Field>

        <Field label="Début *" error={errors.startDate?.message}>
          <Input type="date" {...register("startDate")} />
        </Field>

        <Field label="Fin *" error={errors.endDate?.message}>
          <Input type="date" {...register("endDate")} />
        </Field>

        <Field label="Plafond km" error={errors.mileageCapKm?.message}>
          <Input type="number" min={1} {...numberSetter("mileageCapKm")} placeholder="45000" />
        </Field>

        <Field label="Valeur de rachat (€)" error={errors.buyoutValue?.message}>
          <Input type="number" step="0.01" min={0} {...numberSetter("buyoutValue")} placeholder="8500" />
        </Field>

        {isEdit && (
          <Field label="Statut" span={2}>
            <Select value={status} onValueChange={(v) => setStatus(v as LeasingStatusApi)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leasingStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {leasingStatusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field label="Notes" error={errors.notes?.message} span={2}>
          <Textarea {...register("notes")} rows={2} placeholder="Informations complémentaires…" />
        </Field>
      </div>
    </FormDialog>
  );
}

function Field({
  label,
  error,
  span,
  children,
}: {
  label: string;
  error?: string;
  span?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={span === 2 ? "sm:col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
