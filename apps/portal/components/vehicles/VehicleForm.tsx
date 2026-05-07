"use client";

import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
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

export interface VehicleFormProps {
  register: UseFormRegister<VehicleFormValues>;
  control: Control<VehicleFormValues>;
  errors: FieldErrors<VehicleFormValues>;
  customerLocked?: boolean;
  initialCustomerLabel?: string;
}

export function VehicleForm({
  register,
  control,
  errors,
  customerLocked,
  initialCustomerLabel,
}: VehicleFormProps) {
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

      <Field label="Marque *" error={errors.make?.message}>
        <Input {...register("make")} placeholder="Renault" />
      </Field>

      <Field label="Modèle *" error={errors.model?.message}>
        <Input {...register("model")} placeholder="Clio IV" />
      </Field>

      <Field label="Année *" error={errors.year?.message}>
        <Input
          type="number"
          {...register("year", { valueAsNumber: true })}
          min={1950}
        />
      </Field>

      <Field label="Immatriculation *" error={errors.licensePlate?.message}>
        <Input
          {...register("licensePlate")}
          className="uppercase"
          placeholder="AB-123-CD"
        />
      </Field>

      <Field label="VIN" error={errors.vin?.message}>
        <Input {...register("vin")} placeholder="VF1..." />
      </Field>

      <Field label="Couleur" error={errors.color?.message}>
        <Input {...register("color")} placeholder="Gris foncé" />
      </Field>

      <Field label="Type de moteur *" error={errors.engineType?.message}>
        <Controller
          control={control}
          name="engineType"
          render={({ field }) => (
            <Select
              items={engineTypeLabels}
              value={field.value}
              onValueChange={(v) => v && field.onChange(v as EngineType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
