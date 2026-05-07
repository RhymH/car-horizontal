"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { CustomerCombobox } from "@/components/vehicles/CustomerCombobox";
import { VehicleCombobox } from "@/components/timeline/VehicleCombobox";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import {
  reminderChannelLabels,
  reminderChannels,
  remindersApi,
  type Reminder,
  type ReminderChannelApi,
} from "@/lib/api/reminders";
import {
  reminderFormSchema,
  type ReminderFormValues,
} from "@/lib/schemas/reminder";

type Mode =
  | { kind: "create"; presetCustomerId?: string; presetVehicleId?: string }
  | { kind: "edit"; reminder: Reminder };

export interface ReminderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
}

const CHANNEL_ITEMS: Record<string, string> = reminderChannelLabels;

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

function buildDefaults(mode: Mode): ReminderFormValues {
  if (mode.kind === "edit") {
    return {
      customerId: mode.reminder.customerId,
      vehicleId: mode.reminder.vehicleId ?? "",
      channel: mode.reminder.channel,
      scheduledAt: toLocalInputValue(mode.reminder.scheduledAt),
      resolvedSubject: mode.reminder.resolvedSubject ?? "",
      resolvedBody: mode.reminder.resolvedBody ?? "",
    };
  }
  return {
    customerId: mode.presetCustomerId ?? "",
    vehicleId: mode.presetVehicleId ?? "",
    channel: "Email",
    scheduledAt: defaultScheduledAt(),
    resolvedSubject: "",
    resolvedBody: "",
  };
}

function emptyToUndef(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  return t.length === 0 ? undefined : t;
}

export function ReminderFormDialog({
  open,
  onOpenChange,
  mode,
}: ReminderFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = mode.kind === "edit";

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    mode: "onBlur",
    defaultValues: buildDefaults(mode),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(buildDefaults(mode));
  }, [open, mode, form]);

  const mutation = useMutation({
    mutationFn: async (values: ReminderFormValues) => {
      const scheduledAt = fromLocalInputValue(values.scheduledAt);

      if (isEdit) {
        return remindersApi.update(mode.reminder.id, {
          channel: values.channel,
          scheduledAt,
          resolvedSubject: emptyToUndef(values.resolvedSubject) ?? "",
          resolvedBody: emptyToUndef(values.resolvedBody) ?? "",
        });
      }

      return remindersApi.create({
        customerId: values.customerId,
        vehicleId: emptyToUndef(values.vehicleId),
        channel: values.channel,
        scheduledAt,
        resolvedSubject: emptyToUndef(values.resolvedSubject),
        resolvedBody: emptyToUndef(values.resolvedBody),
      });
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Rappel mis à jour" : "Rappel programmé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reminders.all(),
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
      title={isEdit ? "Modifier le rappel" : "Nouveau rappel"}
      description={
        isEdit
          ? "Mettez à jour les informations de ce rappel."
          : "Programmez un rappel SMS ou email pour un client."
      }
      pending={mutation.isPending}
      onSubmit={submit}
      submitLabel={isEdit ? "Enregistrer" : "Programmer"}
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
                initialLabel={isEdit ? mode.reminder.customerFullName : undefined}
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
                disabled={isEdit}
                initialLabel={
                  isEdit && mode.reminder.vehicleId
                    ? `${mode.reminder.licensePlate ?? ""} · ${mode.reminder.vehicleLabel ?? ""}`.trim()
                    : undefined
                }
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Canal</Label>
            <Controller
              control={form.control}
              name="channel"
              render={({ field }) => (
                <Select
                  items={CHANNEL_ITEMS}
                  value={field.value}
                  onValueChange={(v) =>
                    v && field.onChange(v as ReminderChannelApi)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {reminderChannels.map((c) => (
                      <SelectItem key={c} value={c}>
                        {reminderChannelLabels[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="re-scheduled-at">Date d&apos;envoi</Label>
            <Input
              id="re-scheduled-at"
              type="datetime-local"
              {...form.register("scheduledAt")}
            />
            {errors.scheduledAt && (
              <p className="text-xs text-destructive">
                {errors.scheduledAt.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="re-subject">Sujet (email)</Label>
          <Input
            id="re-subject"
            {...form.register("resolvedSubject")}
            placeholder="Vidange à prévoir"
          />
          {errors.resolvedSubject && (
            <p className="text-xs text-destructive">
              {errors.resolvedSubject.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="re-body">Message</Label>
          <Textarea
            id="re-body"
            rows={5}
            {...form.register("resolvedBody")}
            placeholder="Bonjour, votre prochain entretien arrive bientôt…"
          />
          {errors.resolvedBody && (
            <p className="text-xs text-destructive">
              {errors.resolvedBody.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            En Phase 9, vous pourrez piocher dans des templates avec variables
            résolues automatiquement.
          </p>
        </div>
      </div>
    </FormDialog>
  );
}
