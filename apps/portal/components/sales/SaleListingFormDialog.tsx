"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDialog } from "@/components/ui/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { salesApi, type SaleDossier } from "@/lib/api/sales";
import {
  saleListingFormSchema,
  type SaleListingFormValues,
} from "@/lib/schemas/sale";
import { useSaleDossierMutation } from "@/lib/hooks/useSaleDossier";
import { dateInputToIso, toDateInput } from "@/components/sales/saleFormat";

function buildDefaults(dossier: SaleDossier): SaleListingFormValues {
  const l = dossier.listing;
  return {
    title: l?.title ?? "",
    description: l?.description ?? "",
    equipment: l?.equipment ?? "",
    internalNotes: l?.internalNotes ?? "",
    askingPrice: l?.askingPrice ?? null,
    floorPrice: l?.floorPrice ?? null,
    purchasePrice: l?.purchasePrice ?? null,
    reconditioningCost: l?.reconditioningCost ?? null,
    origin: l?.origin ?? "",
    ownersCount: l?.ownersCount ?? null,
    keysCount: l?.keysCount ?? null,
    warrantyMonths: l?.warrantyMonths ?? null,
    nonPledgeCertificateAt: toDateInput(l?.nonPledgeCertificateAt),
    listedAt: toDateInput(l?.listedAt),
    soldPrice: l?.soldPrice ?? null,
    soldAt: toDateInput(l?.soldAt),
    buyerName: l?.buyerName ?? "",
  };
}

/**
 * Édition du dossier de vente. Le prix affiché est modifiable ici comme dans la
 * modale dédiée : dans les deux cas le serveur écrit une ligne d'historique.
 */
export function SaleListingFormDialog({
  open,
  onOpenChange,
  dossier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: SaleDossier;
}) {
  // Monté à l'ouverture de la modale : les valeurs initiales suffisent.
  const listing = dossier.listing;
  const [flags, setFlags] = useState({
    isPriceNegotiable: listing?.isPriceNegotiable ?? true,
    hasServiceBook: listing?.hasServiceBook ?? false,
    hasRegistrationCertificate: listing?.hasRegistrationCertificate ?? false,
    isDamagedHistory: listing?.isDamagedHistory ?? false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SaleListingFormValues>({
    resolver: zodResolver(saleListingFormSchema),
    defaultValues: buildDefaults(dossier),
  });

  const mutation = useSaleDossierMutation(
    dossier.vehicleId,
    (values: SaleListingFormValues) =>
      salesApi.upsertListing(dossier.vehicleId, {
        title: values.title?.trim() || null,
        description: values.description?.trim() || null,
        equipment: values.equipment?.trim() || null,
        internalNotes: values.internalNotes?.trim() || null,
        askingPrice: values.askingPrice ?? undefined,
        floorPrice: values.floorPrice ?? undefined,
        purchasePrice: values.purchasePrice ?? undefined,
        reconditioningCost: values.reconditioningCost ?? undefined,
        origin: values.origin?.trim() || null,
        ownersCount: values.ownersCount ?? undefined,
        keysCount: values.keysCount ?? undefined,
        warrantyMonths: values.warrantyMonths ?? undefined,
        nonPledgeCertificateAt: dateInputToIso(values.nonPledgeCertificateAt) ?? undefined,
        listedAt: dateInputToIso(values.listedAt) ?? undefined,
        soldPrice: values.soldPrice ?? undefined,
        soldAt: dateInputToIso(values.soldAt) ?? undefined,
        buyerName: values.buyerName?.trim() || null,
        ...flags,
      }),
    {
      successMessage: "Dossier enregistré",
      errorMessage: "Enregistrement impossible.",
      onDone: () => onOpenChange(false),
    },
  );

  const isSold = listing?.status === "Sold" || listing?.status === "Reserved";

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Dossier de vente"
      description="Prix, texte d'annonce et éléments à remettre à l'acheteur."
      submitLabel="Enregistrer"
      pending={mutation.isPending}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      size="lg"
    >
      <div className="max-h-[60vh] overflow-y-auto pr-1">
        <Group title="Prix">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prix affiché (€)" error={errors.askingPrice?.message}>
              <NumberInput step="50" {...register("askingPrice", numberOptions)} />
            </Field>
            <Field label="Prix plancher (€) — interne" error={errors.floorPrice?.message}>
              <NumberInput step="50" {...register("floorPrice", numberOptions)} />
            </Field>
            <Field label="Prix d'achat (€) — interne" error={errors.purchasePrice?.message}>
              <NumberInput step="50" {...register("purchasePrice", numberOptions)} />
            </Field>
            <Field label="Remise en état (€) — interne" error={errors.reconditioningCost?.message}>
              <NumberInput step="10" {...register("reconditioningCost", numberOptions)} />
            </Field>
            <Field label="Mise en vente le" span={2} error={errors.listedAt?.message}>
              <Input type="date" {...register("listedAt")} />
            </Field>
            <Toggle
              label="Prix négociable"
              checked={flags.isPriceNegotiable}
              onChange={(v) => setFlags((f) => ({ ...f, isPriceNegotiable: v }))}
            />
          </div>
        </Group>

        <Group title="Annonce">
          <div className="grid gap-3">
            <Field label="Titre" error={errors.title?.message}>
              <Input
                placeholder="Peugeot 308 1.5 BlueHDi 130 Allure — 1re main"
                {...register("title")}
              />
            </Field>
            <Field label="Description" error={errors.description?.message}>
              <Textarea rows={5} {...register("description")} />
            </Field>
            <Field label="Équipements (une ligne par élément)" error={errors.equipment?.message}>
              <Textarea rows={4} placeholder={"Climatisation automatique\nRégulateur adaptatif\nCaméra de recul"} {...register("equipment")} />
            </Field>
          </div>
        </Group>

        <Group title="Historique et remise">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Provenance" error={errors.origin?.message}>
              <Input placeholder="Reprise client, achat pro…" {...register("origin")} />
            </Field>
            <Field label="Nombre de propriétaires" error={errors.ownersCount?.message}>
              <NumberInput {...register("ownersCount", numberOptions)} />
            </Field>
            <Field label="Nombre de clés" error={errors.keysCount?.message}>
              <NumberInput {...register("keysCount", numberOptions)} />
            </Field>
            <Field label="Garantie (mois)" error={errors.warrantyMonths?.message}>
              <NumberInput {...register("warrantyMonths", numberOptions)} />
            </Field>
            <Field
              label="Certificat de non-gage obtenu le"
              span={2}
              error={errors.nonPledgeCertificateAt?.message}
            >
              <Input type="date" {...register("nonPledgeCertificateAt")} />
              <span className="text-xs text-muted-foreground">
                Le certificat de situation administrative doit dater de moins de 15 jours
                à la cession.
              </span>
            </Field>
            <Toggle
              label="Carnet d'entretien suivi"
              checked={flags.hasServiceBook}
              onChange={(v) => setFlags((f) => ({ ...f, hasServiceBook: v }))}
            />
            <Toggle
              label="Carte grise disponible"
              checked={flags.hasRegistrationCertificate}
              onChange={(v) => setFlags((f) => ({ ...f, hasRegistrationCertificate: v }))}
            />
            <Toggle
              label="Véhicule accidenté / réparé"
              checked={flags.isDamagedHistory}
              onChange={(v) => setFlags((f) => ({ ...f, isDamagedHistory: v }))}
            />
          </div>
        </Group>

        {isSold && (
          <Group title="Vente conclue">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Prix de vente (€)" error={errors.soldPrice?.message}>
                <NumberInput step="50" {...register("soldPrice", numberOptions)} />
              </Field>
              <Field label="Vendu le" error={errors.soldAt?.message}>
                <Input type="date" {...register("soldAt")} />
              </Field>
              <Field label="Acheteur" span={2} error={errors.buyerName?.message}>
                <Input {...register("buyerName")} />
              </Field>
            </div>
          </Group>
        )}

        <Group title="Notes internes">
          <Field label="Jamais exportées dans une annonce" error={errors.internalNotes?.message}>
            <Textarea rows={3} {...register("internalNotes")} />
          </Field>
        </Group>
      </div>
    </FormDialog>
  );
}

const numberOptions = {
  setValueAs: (v: unknown) => (v === "" || v == null ? null : Number(v)),
};

function NumberInput(props: React.ComponentProps<typeof Input>) {
  return <Input type="number" min={0} {...props} />;
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
    <div
      className={
        span === 2 ? "sm:col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"
      }
    >
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  );
}
