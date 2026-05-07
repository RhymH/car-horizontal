"use client";

import { useState } from "react";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerCombobox } from "@/components/vehicles/CustomerCombobox";
import { VehicleModelPicker } from "@/components/vehicles/VehicleModelPicker";
import { engineTypeLabels } from "@/lib/api/vehicles";
import {
  engineTypes,
  transmissionLabels,
  transmissionTypes,
  type EngineType,
  type Transmission,
  type VehicleFormValues,
} from "@/lib/schemas/vehicle";
import { cn } from "@/lib/utils";
import { CircleAlert, Sparkles } from "lucide-react";

export interface VehicleFormProps {
  register: UseFormRegister<VehicleFormValues>;
  control: Control<VehicleFormValues>;
  watch: UseFormWatch<VehicleFormValues>;
  setValue: UseFormSetValue<VehicleFormValues>;
  errors: FieldErrors<VehicleFormValues>;
  customerLocked?: boolean;
  initialCustomerLabel?: string;
}

export function VehicleForm({
  register,
  control,
  watch,
  setValue,
  errors,
  customerLocked,
  initialCustomerLabel,
}: VehicleFormProps) {
  const vehicleModelId = watch("vehicleModelId");
  const vehicleModelLabel = watch("vehicleModelLabel");
  const [legacyMode, setLegacyMode] = useState<boolean>(!vehicleModelId);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Client *"
        error={errors.customerId?.message}
        span={2}
      >
        <Controller
          control={control}
          name="customerId"
          render={({ field }) => (
            <CustomerCombobox
              value={field.value}
              onChange={(id) => field.onChange(id)}
              disabled={customerLocked}
              initialLabel={initialCustomerLabel}
            />
          )}
        />
      </Field>

      <Field
        label="Modèle (catalogue constructeur) *"
        error={errors.vehicleModelId?.message}
        span={2}
        hint={
          vehicleModelId
            ? "Le programme d'entretien constructeur sera attaché automatiquement."
            : "Recherchez votre modèle pour bénéficier des rappels précis (vidange, courroie, etc.)."
        }
      >
        <Controller
          control={control}
          name="vehicleModelId"
          render={({ field }) => (
            <VehicleModelPicker
              value={field.value ?? null}
              initialLabel={vehicleModelLabel}
              onChange={(model) => {
                if (!model) {
                  field.onChange(null);
                  setValue("vehicleModelLabel", null);
                  setValue("selectedProgramId", null);
                  return;
                }
                field.onChange(model.id);
                setValue("vehicleModelLabel", model.displayName);
                const def = model.programs.find((p) => p.isDefault) ?? model.programs[0];
                setValue("selectedProgramId", def?.id ?? null);
                if (!watch("make")) setValue("make", model.make);
                if (!watch("model")) setValue("model", model.model);
                if (!watch("year") || watch("year") === 0)
                  setValue("year", model.productionStartYear);
                setValue("engineType", model.engineType);
                setLegacyMode(false);
              }}
            />
          )}
        />
        {vehicleModelId && (
          <button
            type="button"
            onClick={() => {
              setValue("vehicleModelId", null);
              setValue("vehicleModelLabel", null);
              setValue("selectedProgramId", null);
              setLegacyMode(true);
            }}
            className="text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Détacher le modèle catalogue
          </button>
        )}
        {!vehicleModelId && !legacyMode && (
          <button
            type="button"
            onClick={() => setLegacyMode(true)}
            className="text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Mon modèle n'est pas dans la liste — saisie libre
          </button>
        )}
        {!vehicleModelId && legacyMode && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Mode saisie libre : les rappels seront génériques pour ce véhicule.
              Vous pourrez attacher un modèle plus tard.
            </span>
          </div>
        )}
        {vehicleModelId && (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Modèle catalogue attaché — la timeline se peuplera automatiquement
              avec les entretiens constructeur.
            </span>
          </div>
        )}
      </Field>

      <Field label="Marque *" error={errors.make?.message}>
        <Input
          {...register("make")}
          placeholder="Renault"
          disabled={!!vehicleModelId && !legacyMode}
        />
      </Field>

      <Field label="Modèle *" error={errors.model?.message}>
        <Input
          {...register("model")}
          placeholder="Clio IV"
          disabled={!!vehicleModelId && !legacyMode}
        />
      </Field>

      <Field label="Année" error={errors.year?.message}>
        <Input
          type="number"
          {...register("year", {
            setValueAs: (v) =>
              v === "" || v === null || v === undefined ? null : Number(v),
          })}
          min={1950}
          placeholder="Optionnel"
        />
      </Field>

      <Field label="Immatriculation" error={errors.licensePlate?.message}>
        <Input
          {...register("licensePlate")}
          className="uppercase"
          placeholder="AB-123-CD (optionnel)"
        />
      </Field>

      <Field label="VIN" error={errors.vin?.message}>
        <Input {...register("vin")} placeholder="VF1..." />
      </Field>

      <Field label="Couleur" error={errors.color?.message}>
        <Input {...register("color")} placeholder="Gris foncé" />
      </Field>

      <Field label="Type de moteur" error={errors.engineType?.message}>
        <Controller
          control={control}
          name="engineType"
          render={({ field }) => (
            <Select
              items={{ __none: "—", ...engineTypeLabels }}
              value={field.value ?? "__none"}
              onValueChange={(v) =>
                field.onChange(v === "__none" ? null : (v as EngineType))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {engineTypes.map((e) => (
                  <SelectItem key={e} value={e}>
                    {engineTypeLabels[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label="Boîte de vitesses">
        <Controller
          control={control}
          name="transmissionType"
          render={({ field }) => (
            <Select
              items={{ __none: "—", ...transmissionLabels }}
              value={field.value || "__none"}
              onValueChange={(v) =>
                field.onChange(v === "__none" ? undefined : (v as Transmission))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {transmissionTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {transmissionLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label="Date d'achat">
        <Input type="date" {...register("purchasedAt")} />
      </Field>

      <Field label="Kilométrage *" error={errors.currentMileage?.message}>
        <Input
          type="number"
          {...register("currentMileage", { valueAsNumber: true })}
          min={0}
          placeholder="0"
        />
      </Field>
    </div>
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
