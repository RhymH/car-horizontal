"use client";

import { useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDialog } from "@/components/ui/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salesApi, type RegistrationDetail } from "@/lib/api/sales";
import {
  registrationFormSchema,
  type RegistrationFormValues,
} from "@/lib/schemas/sale";
import { useSaleDossierMutation } from "@/lib/hooks/useSaleDossier";
import { dateInputToIso, toDateInput } from "@/components/sales/saleFormat";

/** Codes carburant du repère P.3, tels qu'ils figurent sur le certificat. */
const FUEL_CODES = ["ES", "GO", "EE", "EH", "EL", "GP", "GN", "GL", "GH", "FE", "H2"];

function buildDefaults(r: RegistrationDetail | null): RegistrationFormValues {
  return {
    firstRegisteredAt: toDateInput(r?.firstRegisteredAt),
    certificateIssuedAt: toDateInput(r?.certificateIssuedAt),
    certificateFormulaNumber: r?.certificateFormulaNumber ?? "",
    holderName: r?.holderName ?? "",
    holderAddress: r?.holderAddress ?? "",
    typeVariantVersion: r?.typeVariantVersion ?? "",
    nationalTypeCode: r?.nationalTypeCode ?? "",
    commercialName: r?.commercialName ?? "",
    typeApprovalNumber: r?.typeApprovalNumber ?? "",
    euCategory: r?.euCategory ?? "",
    nationalGenre: r?.nationalGenre ?? "",
    euBodyType: r?.euBodyType ?? "",
    nationalBodyType: r?.nationalBodyType ?? "",
    technicallyPermissibleMaxMassKg: r?.technicallyPermissibleMaxMassKg ?? null,
    maxMassInServiceKg: r?.maxMassInServiceKg ?? null,
    maxTrainMassKg: r?.maxTrainMassKg ?? null,
    massInServiceKg: r?.massInServiceKg ?? null,
    nationalEmptyMassKg: r?.nationalEmptyMassKg ?? null,
    engineDisplacementCm3: r?.engineDisplacementCm3 ?? null,
    maxNetPowerKw: r?.maxNetPowerKw ?? null,
    fuelCode: r?.fuelCode ?? "",
    fiscalHorsepower: r?.fiscalHorsepower ?? null,
    powerToMassRatio: r?.powerToMassRatio ?? null,
    seatingCapacity: r?.seatingCapacity ?? null,
    standingCapacity: r?.standingCapacity ?? null,
    soundLevelDb: r?.soundLevelDb ?? null,
    engineSpeedRpm: r?.engineSpeedRpm ?? null,
    co2GramsPerKm: r?.co2GramsPerKm ?? null,
    emissionClass: r?.emissionClass ?? "",
    lastTechnicalInspectionAt: toDateInput(r?.lastTechnicalInspectionAt),
    technicalInspectionValidUntil: toDateInput(r?.technicalInspectionValidUntil),
  };
}

/**
 * Saisie de la carte grise. Les champs sont regroupés dans l'ordre de lecture du
 * document et portent leur repère officiel : le garagiste recopie de haut en bas
 * sans chercher la correspondance.
 */
export function RegistrationFormDialog({
  open,
  onOpenChange,
  vehicleId,
  registration,
  highlightFields = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  registration: RegistrationDetail | null;
  /** Champs manquants, mis en évidence à l'ouverture. */
  highlightFields?: string[];
}) {
  // Monté à l'ouverture de la modale : les valeurs initiales suffisent.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: buildDefaults(registration),
  });

  const mutation = useSaleDossierMutation(
    vehicleId,
    (values: RegistrationFormValues) =>
      salesApi.upsertRegistration(vehicleId, {
        firstRegisteredAt: dateInputToIso(values.firstRegisteredAt),
        certificateIssuedAt: dateInputToIso(values.certificateIssuedAt),
        certificateFormulaNumber: text(values.certificateFormulaNumber),
        holderName: text(values.holderName),
        holderAddress: text(values.holderAddress),
        typeVariantVersion: text(values.typeVariantVersion),
        nationalTypeCode: text(values.nationalTypeCode),
        commercialName: text(values.commercialName),
        typeApprovalNumber: text(values.typeApprovalNumber),
        euCategory: text(values.euCategory),
        nationalGenre: text(values.nationalGenre),
        euBodyType: text(values.euBodyType),
        nationalBodyType: text(values.nationalBodyType),
        technicallyPermissibleMaxMassKg: values.technicallyPermissibleMaxMassKg ?? null,
        maxMassInServiceKg: values.maxMassInServiceKg ?? null,
        maxTrainMassKg: values.maxTrainMassKg ?? null,
        massInServiceKg: values.massInServiceKg ?? null,
        nationalEmptyMassKg: values.nationalEmptyMassKg ?? null,
        engineDisplacementCm3: values.engineDisplacementCm3 ?? null,
        maxNetPowerKw: values.maxNetPowerKw ?? null,
        fuelCode: text(values.fuelCode),
        fiscalHorsepower: values.fiscalHorsepower ?? null,
        powerToMassRatio: values.powerToMassRatio ?? null,
        seatingCapacity: values.seatingCapacity ?? null,
        standingCapacity: values.standingCapacity ?? null,
        soundLevelDb: values.soundLevelDb ?? null,
        engineSpeedRpm: values.engineSpeedRpm ?? null,
        co2GramsPerKm: values.co2GramsPerKm ?? null,
        emissionClass: text(values.emissionClass),
        lastTechnicalInspectionAt: dateInputToIso(values.lastTechnicalInspectionAt),
        technicalInspectionValidUntil: dateInputToIso(values.technicalInspectionValidUntil),
      }),
    {
      successMessage: "Carte grise enregistrée",
      errorMessage: "Enregistrement impossible.",
      onDone: () => onOpenChange(false),
    },
  );

  const missing = new Set(highlightFields);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Carte grise"
      description="Recopiez les repères du certificat d'immatriculation. Tout est facultatif : l'encart d'aide indique ce qui manque encore."
      submitLabel="Enregistrer"
      pending={mutation.isPending}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      size="lg"
    >
      <div className="max-h-[60vh] overflow-y-auto pr-1">
        <Group title="Identification">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field marker="B" label="1re immatriculation" missing={missing.has("firstRegisteredAt")} error={errors.firstRegisteredAt?.message}>
              <Input type="date" {...register("firstRegisteredAt")} />
            </Field>
            <Field marker="I" label="Date du certificat" error={errors.certificateIssuedAt?.message}>
              <Input type="date" {...register("certificateIssuedAt")} />
            </Field>
            <Field label="N° de formule" missing={missing.has("certificateFormulaNumber")} error={errors.certificateFormulaNumber?.message}>
              <Input placeholder="2019AB12345" {...register("certificateFormulaNumber")} />
            </Field>
            <Field marker="C.1" label="Titulaire" missing={missing.has("holderName")} error={errors.holderName?.message}>
              <Input {...register("holderName")} />
            </Field>
            <Field marker="C.3" label="Adresse du titulaire" span={2} missing={missing.has("holderAddress")} error={errors.holderAddress?.message}>
              <Input {...register("holderAddress")} />
            </Field>
          </div>
        </Group>

        <Group title="Type et réception">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field marker="D.2" label="Type, variante, version" missing={missing.has("typeVariantVersion")} error={errors.typeVariantVersion?.message}>
              <Input {...register("typeVariantVersion")} />
            </Field>
            <Field marker="D.2.1" label="Type national (mines)" missing={missing.has("nationalTypeCode")} error={errors.nationalTypeCode?.message}>
              <Input {...register("nationalTypeCode")} />
            </Field>
            <Field marker="D.3" label="Dénomination commerciale" missing={missing.has("commercialName")} error={errors.commercialName?.message}>
              <Input {...register("commercialName")} />
            </Field>
            <Field marker="K" label="Réception par type" missing={missing.has("typeApprovalNumber")} error={errors.typeApprovalNumber?.message}>
              <Input {...register("typeApprovalNumber")} />
            </Field>
            <Field marker="J" label="Catégorie CE" missing={missing.has("euCategory")} error={errors.euCategory?.message}>
              <Input placeholder="M1" {...register("euCategory")} />
            </Field>
            <Field marker="J.1" label="Genre national" missing={missing.has("nationalGenre")} error={errors.nationalGenre?.message}>
              <Input placeholder="VP" {...register("nationalGenre")} />
            </Field>
            <Field marker="J.2" label="Carrosserie CE" error={errors.euBodyType?.message}>
              <Input placeholder="AB" {...register("euBodyType")} />
            </Field>
            <Field marker="J.3" label="Carrosserie nationale" error={errors.nationalBodyType?.message}>
              <Input placeholder="BREAK" {...register("nationalBodyType")} />
            </Field>
          </div>
        </Group>

        <Group title="Masses">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField marker="F.1" label="MMA technique (kg)" name="technicallyPermissibleMaxMassKg" register={register} missing={missing.has("technicallyPermissibleMaxMassKg")} error={errors.technicallyPermissibleMaxMassKg?.message} />
            <NumberField marker="F.2" label="MMA en service (kg)" name="maxMassInServiceKg" register={register} error={errors.maxMassInServiceKg?.message} />
            <NumberField marker="F.3" label="MMA de l'ensemble (kg)" name="maxTrainMassKg" register={register} error={errors.maxTrainMassKg?.message} />
            <NumberField marker="G" label="Masse en service (kg)" name="massInServiceKg" register={register} missing={missing.has("massInServiceKg")} error={errors.massInServiceKg?.message} />
            <NumberField marker="G.1" label="Poids à vide national (kg)" name="nationalEmptyMassKg" register={register} error={errors.nationalEmptyMassKg?.message} />
          </div>
        </Group>

        <Group title="Motorisation">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField marker="P.1" label="Cylindrée (cm³)" name="engineDisplacementCm3" register={register} error={errors.engineDisplacementCm3?.message} />
            <NumberField marker="P.2" label="Puissance nette (kW)" name="maxNetPowerKw" register={register} step="0.01" error={errors.maxNetPowerKw?.message} />
            <Field marker="P.3" label="Carburant" missing={missing.has("fuelCode")} error={errors.fuelCode?.message}>
              <Input list="fuel-codes" placeholder="GO" {...register("fuelCode")} />
              <datalist id="fuel-codes">
                {FUEL_CODES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <NumberField marker="P.6" label="Puissance administrative (CV)" name="fiscalHorsepower" register={register} missing={missing.has("fiscalHorsepower")} error={errors.fiscalHorsepower?.message} />
            <NumberField marker="U.1" label="Niveau sonore (dB)" name="soundLevelDb" register={register} error={errors.soundLevelDb?.message} />
            <NumberField marker="U.2" label="Régime moteur (min⁻¹)" name="engineSpeedRpm" register={register} error={errors.engineSpeedRpm?.message} />
          </div>
        </Group>

        <Group title="Places, émissions et contrôle technique">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField marker="S.1" label="Places assises" name="seatingCapacity" register={register} missing={missing.has("seatingCapacity")} error={errors.seatingCapacity?.message} />
            <NumberField marker="S.2" label="Places debout" name="standingCapacity" register={register} error={errors.standingCapacity?.message} />
            <NumberField marker="V.7" label="CO₂ (g/km)" name="co2GramsPerKm" register={register} error={errors.co2GramsPerKm?.message} />
            <Field marker="V.9" label="Classe environnementale" error={errors.emissionClass?.message}>
              <Input placeholder="EURO 6" {...register("emissionClass")} />
            </Field>
            <Field marker="X.1" label="Dernier contrôle technique" missing={missing.has("lastTechnicalInspectionAt")} error={errors.lastTechnicalInspectionAt?.message}>
              <Input type="date" {...register("lastTechnicalInspectionAt")} />
            </Field>
            <Field label="Validité du contrôle technique" error={errors.technicalInspectionValidUntil?.message}>
              <Input type="date" {...register("technicalInspectionValidUntil")} />
            </Field>
          </div>
        </Group>
      </div>
    </FormDialog>
  );
}

function text(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 last:mb-0">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Field({
  marker,
  label,
  error,
  span,
  missing,
  children,
}: {
  marker?: string;
  label: string;
  error?: string;
  span?: 1 | 2;
  missing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        span === 2 ? "sm:col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"
      }
    >
      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {marker && (
          <span className="rounded bg-muted px-1 font-mono text-[10px]">{marker}</span>
        )}
        {label}
        {missing && (
          <span className="text-[10px] uppercase text-amber-600 dark:text-amber-400">
            manquant
          </span>
        )}
      </Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

/** Champ numérique : "" doit devenir null, pas NaN. */
function NumberField({
  marker,
  label,
  name,
  register,
  error,
  missing,
  step,
}: {
  marker?: string;
  label: string;
  name: keyof RegistrationFormValues;
  register: UseFormRegister<RegistrationFormValues>;
  error?: string;
  missing?: boolean;
  step?: string;
}) {
  return (
    <Field marker={marker} label={label} error={error} missing={missing}>
      <Input
        type="number"
        step={step ?? "1"}
        {...register(name, {
          setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
        })}
      />
    </Field>
  );
}
