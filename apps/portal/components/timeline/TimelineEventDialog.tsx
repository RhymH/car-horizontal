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
import { VehicleCombobox } from "@/components/timeline/VehicleCombobox";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import {
  timelineApi,
  timelineEventKindLabels,
  timelineEventKinds,
  type TimelineEvent,
} from "@/lib/api/timeline";
import {
  timelineEventFormSchema,
  type TimelineEventFormValues,
} from "@/lib/schemas/timeline";

type Mode =
  | { kind: "create"; defaultVehicleId?: string; defaultVehicleLabel?: string }
  | { kind: "edit"; event: TimelineEvent };

export interface TimelineEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
}

const KIND_ITEMS: Record<string, string> = timelineEventKindLabels;

function buildDefaults(defaultVehicleId?: string): TimelineEventFormValues {
  return {
    vehicleId: defaultVehicleId ?? "",
    kind: "Custom",
    title: "",
    description: "",
    dueAt: "",
    dueMileage: undefined,
  };
}

function toFormValues(e: TimelineEvent): TimelineEventFormValues {
  return {
    vehicleId: e.vehicleId,
    kind: e.kind,
    title: e.title,
    description: e.description ?? "",
    dueAt: e.dueAt ? e.dueAt.slice(0, 10) : "",
    dueMileage: e.dueMileage ?? undefined,
  };
}

function emptyToUndef(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  return t.length === 0 ? undefined : t;
}

export function TimelineEventDialog({
  open,
  onOpenChange,
  mode,
}: TimelineEventDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = mode.kind === "edit";

  const form = useForm<TimelineEventFormValues>({
    resolver: zodResolver(timelineEventFormSchema),
    mode: "onBlur",
    defaultValues: buildDefaults(
      mode.kind === "create" ? mode.defaultVehicleId : undefined,
    ),
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit) form.reset(toFormValues(mode.event));
    else form.reset(buildDefaults(mode.defaultVehicleId));
  }, [open, isEdit, mode, form]);

  const mutation = useMutation({
    mutationFn: async (values: TimelineEventFormValues) => {
      const dueAt = values.dueAt
        ? new Date(values.dueAt).toISOString()
        : undefined;

      if (isEdit) {
        return timelineApi.update(mode.event.id, {
          title: values.title.trim(),
          description: emptyToUndef(values.description),
          dueAt,
          clearDueAt: !dueAt,
          dueMileage: values.dueMileage,
          clearDueMileage: values.dueMileage === undefined,
          kind: values.kind,
        });
      }

      return timelineApi.create({
        vehicleId: values.vehicleId,
        kind: values.kind,
        title: values.title.trim(),
        description: emptyToUndef(values.description),
        dueAt,
        dueMileage: values.dueMileage,
      });
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Événement mis à jour" : "Événement créé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.all(),
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
      title={isEdit ? "Modifier l'événement" : "Nouvel événement timeline"}
      description={
        isEdit
          ? "Mettez à jour les informations de cet événement."
          : "Planifiez un événement manuel pour un véhicule."
      }
      pending={mutation.isPending}
      onSubmit={submit}
      submitLabel={isEdit ? "Enregistrer" : "Créer"}
      size="lg"
    >
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label>Véhicule</Label>
          <Controller
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <VehicleCombobox
                value={field.value}
                onChange={(id) => field.onChange(id)}
                disabled={isEdit}
                initialLabel={
                  isEdit
                    ? `${mode.event.licensePlate} · ${mode.event.vehicleLabel}`
                    : mode.kind === "create"
                      ? mode.defaultVehicleLabel
                      : undefined
                }
              />
            )}
          />
          {errors.vehicleId && (
            <p className="text-xs text-destructive">{errors.vehicleId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Type</Label>
            <Controller
              control={form.control}
              name="kind"
              render={({ field }) => (
                <Select
                  items={KIND_ITEMS}
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {timelineEventKinds.map((k) => (
                      <SelectItem key={k} value={k}>
                        {timelineEventKindLabels[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="te-title">Titre</Label>
            <Input
              id="te-title"
              {...form.register("title")}
              placeholder="Vidange, contrôle technique…"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="te-due-at">Échéance</Label>
            <Input id="te-due-at" type="date" {...form.register("dueAt")} />
            {errors.dueAt && (
              <p className="text-xs text-destructive">{errors.dueAt.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="te-due-mileage">Ou kilométrage cible</Label>
            <Input
              id="te-due-mileage"
              type="number"
              min={0}
              {...form.register("dueMileage", {
                setValueAs: (v) =>
                  v === "" || v === null || v === undefined
                    ? undefined
                    : Number(v),
              })}
            />
            {errors.dueMileage && (
              <p className="text-xs text-destructive">
                {errors.dueMileage.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="te-description">Description</Label>
          <Textarea
            id="te-description"
            {...form.register("description")}
            rows={3}
            placeholder="Notes internes facultatives…"
          />
        </div>
      </div>
    </FormDialog>
  );
}
