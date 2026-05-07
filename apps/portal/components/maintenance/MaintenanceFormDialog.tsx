"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";
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
import {
  maintenanceApi,
  maintenanceTypeLabels,
  maintenanceTypes,
  type MaintenanceRecord,
  type MaintenanceTypeApi,
} from "@/lib/api/maintenance";
import {
  maintenanceFormSchema,
  type MaintenanceFormValues,
} from "@/lib/schemas/maintenance";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type Mode =
  | { kind: "create" }
  | { kind: "edit"; record: MaintenanceRecord };

export interface MaintenanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleCustomerId: string;
  vehicleCurrentMileage: number;
  mode: Mode;
  onSaved?: (record: MaintenanceRecord) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDefaults(currentMileage: number): MaintenanceFormValues {
  return {
    performedAt: todayIso(),
    type: "FullService",
    description: "",
    mileageAtService: currentMileage,
    cost: undefined,
    mechanicName: "",
    nextDueAt: "",
    nextDueMileage: undefined,
  };
}

function toFormValues(r: MaintenanceRecord): MaintenanceFormValues {
  return {
    performedAt: r.performedAt.slice(0, 10),
    type: r.type,
    description: r.description ?? "",
    mileageAtService: r.mileageAtService,
    cost: r.cost ?? undefined,
    mechanicName: r.mechanicName ?? "",
    nextDueAt: r.nextDueAt ? r.nextDueAt.slice(0, 10) : "",
    nextDueMileage: r.nextDueMileage ?? undefined,
  };
}

function trimOrUndefined(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const t = value.trim();
  return t.length === 0 ? undefined : t;
}

export function MaintenanceFormDialog(props: MaintenanceFormDialogProps) {
  const { open, onOpenChange } = props;
  const formKey =
    props.mode.kind === "edit" ? `edit-${props.mode.record.id}` : "create";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open && <MaintenanceFormDialogBody key={formKey} {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceFormDialogBody({
  onOpenChange,
  vehicleId,
  vehicleCustomerId,
  vehicleCurrentMileage,
  mode,
  onSaved,
}: MaintenanceFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = mode.kind === "edit";

  const initialValues =
    mode.kind === "edit"
      ? toFormValues(mode.record)
      : buildDefaults(vehicleCurrentMileage);

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: initialValues,
  });

  const [nextDueOpen, setNextDueOpen] = useState(
    !!initialValues.nextDueAt || initialValues.nextDueMileage != null,
  );

  const mutation = useMutation({
    mutationFn: async (values: MaintenanceFormValues) => {
      const performedAt = new Date(values.performedAt).toISOString();
      const description = trimOrUndefined(values.description);
      const mechanicName = trimOrUndefined(values.mechanicName);
      const nextDueAt = values.nextDueAt
        ? new Date(values.nextDueAt).toISOString()
        : undefined;
      const nextDueMileage = values.nextDueMileage;

      if (isEdit) {
        return maintenanceApi.update(mode.record.id, {
          performedAt,
          type: values.type,
          description: description ?? "",
          mileageAtService: values.mileageAtService,
          cost: values.cost,
          mechanicName,
          nextDueAt,
          nextDueMileage,
          clearNextDueAt: !nextDueAt,
          clearNextDueMileage: nextDueMileage == null,
        });
      }

      return maintenanceApi.create(vehicleId, {
        performedAt,
        type: values.type,
        description,
        mileageAtService: values.mileageAtService,
        cost: values.cost,
        mechanicName,
        nextDueAt,
        nextDueMileage,
      });
    },
    onSuccess: async (saved) => {
      toast.success(isEdit ? "Entretien mis à jour" : "Entretien enregistré");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.vehicles.detail(vehicleId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.maintenance.byVehicle(vehicleId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.customers.detail(vehicleCustomerId),
        }),
      ]);
      onSaved?.(saved);
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(
        extractApiErrorMessage(error, "Enregistrement impossible."),
      );
    },
  });

  const submit = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    await mutation.mutateAsync(form.getValues());
  };

  const errors = form.formState.errors;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Modifier l'entretien" : "Nouvel entretien"}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Mettez à jour les informations de cette intervention."
            : "Enregistrez une intervention pour ce véhicule."}
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date *" error={errors.performedAt?.message}>
            <Input type="date" {...form.register("performedAt")} />
          </Field>

          <Field label="Type *" error={errors.type?.message}>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) =>
                    v && field.onChange(v as MaintenanceTypeApi)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {maintenanceTypeLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            label="Description"
            error={errors.description?.message}
            span={2}
          >
            <Textarea
              rows={3}
              placeholder="Détails de l'intervention…"
              {...form.register("description")}
            />
          </Field>

          <Field
            label="Kilométrage *"
            error={errors.mileageAtService?.message}
          >
            <Input
              type="number"
              min={0}
              {...form.register("mileageAtService", {
                valueAsNumber: true,
              })}
            />
          </Field>

          <Field label="Coût (€)" error={errors.cost?.message}>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="—"
              {...form.register("cost", {
                setValueAs: (v) =>
                  v === "" || v === null ? undefined : Number(v),
              })}
            />
          </Field>

          <Field
            label="Mécanicien"
            error={errors.mechanicName?.message}
            span={2}
          >
            <Input
              placeholder="Nom du mécanicien"
              {...form.register("mechanicName")}
            />
          </Field>
        </div>

        <div className="rounded-md border border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setNextDueOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium"
            aria-expanded={nextDueOpen}
          >
            <span className="flex items-center gap-2">
              {nextDueOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              Prochaine échéance
            </span>
            <span className="text-xs text-muted-foreground">
              Optionnel — génère un événement timeline
            </span>
          </button>
          {nextDueOpen && (
            <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
              <Field
                label="Date d'échéance"
                error={errors.nextDueAt?.message}
              >
                <Input type="date" {...form.register("nextDueAt")} />
              </Field>
              <Field
                label="Kilométrage d'échéance"
                error={errors.nextDueMileage?.message}
              >
                <Input
                  type="number"
                  min={1}
                  placeholder="—"
                  {...form.register("nextDueMileage", {
                    setValueAs: (v) =>
                      v === "" || v === null ? undefined : Number(v),
                  })}
                />
              </Field>
            </div>
          )}
        </div>

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
            Enregistrer
          </AsyncButton>
        </DialogFooter>
      </form>
    </>
  );
}

function Field({
  label,
  error,
  hint,
  span,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  span?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", span === 2 && "sm:col-span-2")}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}
