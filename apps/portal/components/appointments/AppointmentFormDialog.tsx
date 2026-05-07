"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CustomerCombobox } from "@/components/vehicles/CustomerCombobox";
import { VehicleCombobox } from "@/components/timeline/VehicleCombobox";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import {
  appointmentsApi,
  type Appointment,
} from "@/lib/api/appointments";
import {
  appointmentFormSchema,
  type AppointmentFormValues,
} from "@/lib/schemas/appointment";

type Mode =
  | {
      kind: "create";
      presetCustomerId?: string;
      presetVehicleId?: string;
      presetScheduledAt?: string;
    }
  | { kind: "edit"; appointment: Appointment };

export interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function fromLocalInputValue(local: string): string {
  return new Date(local).toISOString();
}

function defaultScheduledAt(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalInputValue(d.toISOString());
}

function buildDefaults(mode: Mode): AppointmentFormValues {
  if (mode.kind === "edit") {
    return {
      customerId: mode.appointment.customerId,
      vehicleId: mode.appointment.vehicleId ?? "",
      subject: mode.appointment.subject,
      scheduledAt: toLocalInputValue(mode.appointment.scheduledAt),
      durationMinutes: mode.appointment.durationMinutes,
      notes: mode.appointment.notes ?? "",
    };
  }
  return {
    customerId: mode.presetCustomerId ?? "",
    vehicleId: mode.presetVehicleId ?? "",
    subject: "",
    scheduledAt: mode.presetScheduledAt
      ? toLocalInputValue(mode.presetScheduledAt)
      : defaultScheduledAt(),
    durationMinutes: 60,
    notes: "",
  };
}

function emptyToUndef(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  return t.length === 0 ? undefined : t;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  mode,
}: AppointmentFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = mode.kind === "edit";

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    mode: "onBlur",
    defaultValues: buildDefaults(mode),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(buildDefaults(mode));
  }, [open, mode, form]);

  const mutation = useMutation({
    mutationFn: async (values: AppointmentFormValues) => {
      const scheduledAt = fromLocalInputValue(values.scheduledAt);
      if (isEdit) {
        const vehicleId = emptyToUndef(values.vehicleId);
        return appointmentsApi.update(mode.appointment.id, {
          scheduledAt,
          durationMinutes: values.durationMinutes,
          subject: values.subject.trim(),
          notes: emptyToUndef(values.notes) ?? "",
          vehicleId,
          clearVehicle: !vehicleId,
        });
      }
      return appointmentsApi.create({
        customerId: values.customerId,
        vehicleId: emptyToUndef(values.vehicleId),
        scheduledAt,
        durationMinutes: values.durationMinutes,
        subject: values.subject.trim(),
        notes: emptyToUndef(values.notes),
      });
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Rendez-vous mis à jour" : "Rendez-vous créé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(extractApiErrorMessage(err, "Une erreur est survenue."));
    },
  });

  const submit = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    await mutation.mutateAsync(form.getValues());
  };

  const errors = form.formState.errors;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
      description={
        isEdit
          ? "Mettez à jour les informations du rendez-vous."
          : "Planifiez un passage au garage pour un client."
      }
      pending={mutation.isPending}
      onSubmit={submit}
      submitLabel={isEdit ? "Enregistrer" : "Créer"}
      size="lg"
    >
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label>Client</Label>
          <Controller
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <CustomerCombobox
                value={field.value}
                onChange={(id) => field.onChange(id)}
                disabled={isEdit}
                initialLabel={
                  isEdit ? mode.appointment.customerFullName : undefined
                }
              />
            )}
          />
          {errors.customerId && (
            <p className="text-xs text-destructive">
              {errors.customerId.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Véhicule (optionnel)</Label>
          <Controller
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <VehicleCombobox
                value={field.value ?? ""}
                onChange={(id) => field.onChange(id ?? "")}
                initialLabel={
                  isEdit && mode.appointment.vehicleId
                    ? `${mode.appointment.licensePlate ?? ""} · ${mode.appointment.vehicleLabel ?? ""}`.trim()
                    : undefined
                }
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ap-subject">Sujet</Label>
          <Input
            id="ap-subject"
            {...form.register("subject")}
            placeholder="Vidange + révision 60 000 km"
          />
          {errors.subject && (
            <p className="text-xs text-destructive">{errors.subject.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ap-scheduled-at">Date et heure</Label>
            <Input
              id="ap-scheduled-at"
              type="datetime-local"
              {...form.register("scheduledAt")}
            />
            {errors.scheduledAt && (
              <p className="text-xs text-destructive">
                {errors.scheduledAt.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ap-duration">Durée (minutes)</Label>
            <Input
              id="ap-duration"
              type="number"
              min={5}
              max={480}
              step={5}
              {...form.register("durationMinutes", { valueAsNumber: true })}
            />
            {errors.durationMinutes && (
              <p className="text-xs text-destructive">
                {errors.durationMinutes.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="ap-notes">Notes</Label>
          <Textarea
            id="ap-notes"
            rows={4}
            {...form.register("notes")}
            placeholder="Détails, demande client, prérequis…"
          />
          {errors.notes && (
            <p className="text-xs text-destructive">{errors.notes.message}</p>
          )}
        </div>
      </div>
    </FormDialog>
  );
}
