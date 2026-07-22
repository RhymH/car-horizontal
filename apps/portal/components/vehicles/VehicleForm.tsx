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
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerCombobox } from "@/components/vehicles/CustomerCombobox";
import { VehicleModelPicker } from "@/components/vehicles/VehicleModelPicker";
import { engineTypeLabels, vehiclesApi } from "@/lib/api/vehicles";
import {
  engineTypes,
  transmissionLabels,
  transmissionTypes,
  type EngineType,
  type Transmission,
  type VehicleFormValues,
} from "@/lib/schemas/vehicle";
import { cn } from "@/lib/utils";
import { CircleAlert, Sparkles, Loader2, Wand2 } from "lucide-react";

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
  const [decoding, setDecoding] = useState(false);

  const makeEditable = !vehicleModelId || legacyMode;

  const handleDecodeVin = async () => {
    const vin = (watch("vin") ?? "").trim();
    if (!vin) {
      toast.error("Saisissez d'abord un VIN.");
      return;
    }
    setDecoding(true);
    try {
      const r = await vehiclesApi.decodeVin(vin);
      if (!r.isValid) {
        toast.error("VIN non reconnu", { description: r.error ?? undefined });
        return;
      }

      // make/model are catalog-controlled — only touch them in free-entry mode.
      if (r.make && makeEditable) setValue("make", r.make, { shouldDirty: true });
      if (r.model && makeEditable) setValue("model", r.model, { shouldDirty: true });
      if (r.modelYear) setValue("year", r.modelYear, { shouldDirty: true });

      // Motorisation: only fill empty fields, never clobber a catalog/user value.
      const engine = mapFuelToEngineType(r.fuelType);
      if (engine && !watch("engineType"))
        setValue("engineType", engine, { shouldDirty: true });
      const transmission = mapTransmission(r.transmissionStyle);
      if (transmission && !watch("transmissionType"))
        setValue("transmissionType", transmission, { shouldDirty: true });

      const displacement = formatDisplacement(r.engineDisplacementL);
      const engineLabel = [displacement && `${displacement} L`, r.fuelType]
        .filter(Boolean)
        .join(" ");
      const summary = [r.make, r.model, r.modelYear, engineLabel || r.country]
        .filter(Boolean)
        .join(" · ");
      toast.success(
        r.source === "nhtsa" ? "VIN décodé (NHTSA)" : "VIN décodé",
        { description: summary || undefined },
      );
    } catch {
      toast.error("Décodage impossible pour le moment.");
    } finally {
      setDecoding(false);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Client *" error={errors.customerId?.message} span={2}>
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
                const def =
                  model.programs.find((p) => p.isDefault) ?? model.programs[0];
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
              Mode saisie libre : les rappels seront génériques pour ce
              véhicule. Vous pourrez attacher un modèle plus tard.
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
          placeholder=""
        />
      </Field>

      <Field label="Immatriculation" error={errors.licensePlate?.message}>
        <Input
          {...register("licensePlate")}
          className="uppercase"
          placeholder="AB-123-CD"
        />
      </Field>

      <Field
        label="VIN"
        error={errors.vin?.message}
        hint="Décodez le VIN pour pré-remplir marque, modèle, année et motorisation."
      >
        <div className="flex gap-2">
          <Input {...register("vin")} placeholder="VF1..." className="uppercase" />
          <Button
            type="button"
            variant="outline"
            onClick={handleDecodeVin}
            disabled={decoding}
          >
            {decoding ? <Loader2 className="animate-spin" /> : <Wand2 />}
            Décoder
          </Button>
        </div>
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

/** NHTSA reports displacement with excessive precision ("2.998832712") — round to 1 dp. */
function formatDisplacement(value: string | null): string | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : value;
}

/** Maps an NHTSA primary fuel type to our engine-type enum (null when unsure). */
function mapFuelToEngineType(fuel: string | null): EngineType | null {
  if (!fuel) return null;
  const f = fuel.toLowerCase();
  if (f.includes("diesel")) return "Diesel";
  if (f.includes("electric")) return "Electric";
  if (f.includes("lpg") || f.includes("propane") || f.includes("liquefied petroleum"))
    return "LPG";
  if (f.includes("gasoline") || f.includes("petrol")) return "Gasoline";
  return null;
}

/** Maps an NHTSA transmission style to our transmission enum (null when unsure). */
function mapTransmission(style: string | null): Transmission | null {
  if (!style) return null;
  const s = style.toLowerCase();
  // Order matters: "Automated Manual" / dual-clutch read as semi-auto, not manual.
  if (s.includes("automated") || s.includes("dual-clutch") || s.includes("dct") || s.includes("amt"))
    return "Semi-Auto";
  if (s.includes("manual")) return "Manual";
  if (s.includes("automatic") || s.includes("continuously variable") || s.includes("cvt"))
    return "Automatic";
  return null;
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
