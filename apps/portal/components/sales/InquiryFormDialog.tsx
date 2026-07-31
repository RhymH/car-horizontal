"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Info } from "lucide-react";
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
import {
  inquiryChannelLabels,
  inquiryChannels,
  inquiryStatusLabels,
  inquiryStatuses,
  salesApi,
  type InquiryChannelApi,
  type InquiryStatusApi,
  type SaleInquiry,
} from "@/lib/api/sales";
import { inquiryFormSchema, type InquiryFormValues } from "@/lib/schemas/sale";
import { useSaleDossierMutation } from "@/lib/hooks/useSaleDossier";
import { dateInputToIso, toDateInput } from "@/components/sales/saleFormat";
import { BuyerPicker, type BuyerSelection } from "@/components/sales/BuyerPicker";

function buildDefaults(inquiry: SaleInquiry | null): InquiryFormValues {
  return {
    offerAmount: inquiry?.offerAmount ?? null,
    receivedAt: toDateInput(inquiry?.receivedAt ?? new Date().toISOString()),
    testDriveAt: toDateInput(inquiry?.testDriveAt),
    nextFollowUpAt: toDateInput(inquiry?.nextFollowUpAt),
    lostReason: inquiry?.lostReason ?? "",
    notes: inquiry?.notes ?? "",
    newBuyerPhone: "",
    newBuyerEmail: "",
  };
}

/**
 * Contact acheteur. Le rattachement à une fiche client est obligatoire : on
 * cherche d'abord un client existant, et à défaut on le crée à la volée — il entre
 * alors dans le pipeline prospects et devient visible depuis sa fiche.
 */
export function InquiryFormDialog({
  open,
  onOpenChange,
  vehicleId,
  inquiry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  inquiry: SaleInquiry | null;
}) {
  // Monté à l'ouverture de la modale : les valeurs initiales suffisent.
  const isEdit = inquiry !== null;
  const [channel, setChannel] = useState<InquiryChannelApi>(inquiry?.channel ?? "Phone");
  const [status, setStatus] = useState<InquiryStatusApi>(inquiry?.status ?? "New");
  const [buyer, setBuyer] = useState<BuyerSelection | null>(
    inquiry
      ? { kind: "existing", customerId: inquiry.customerId, label: inquiry.customerFullName }
      : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: buildDefaults(inquiry),
  });

  const mutation = useSaleDossierMutation(
    vehicleId,
    (values: InquiryFormValues) => {
      const payload = {
        offerAmount: values.offerAmount ?? null,
        receivedAt: dateInputToIso(values.receivedAt),
        testDriveAt: dateInputToIso(values.testDriveAt),
        nextFollowUpAt: dateInputToIso(values.nextFollowUpAt),
        lostReason: values.lostReason?.trim() || null,
        notes: values.notes?.trim() || null,
        channel,
        status,
        // Le serveur refuse les deux à la fois : on n'en envoie qu'un.
        ...(buyer?.kind === "existing"
          ? { customerId: buyer.customerId }
          : buyer?.kind === "new"
            ? {
                newBuyer: {
                  fullName: buyer.fullName,
                  phone: values.newBuyerPhone?.trim() || null,
                  email: values.newBuyerEmail?.trim() || null,
                },
              }
            : {}),
      };

      return isEdit
        ? salesApi.updateInquiry(inquiry.id, payload)
        : salesApi.addInquiry(vehicleId, payload);
    },
    {
      successMessage: isEdit ? "Contact mis à jour" : "Contact enregistré",
      errorMessage: "Enregistrement impossible.",
      onDone: () => onOpenChange(false),
    },
  );

  const onSubmit = handleSubmit((values) => {
    if (!buyer) {
      toast.error("Sélectionnez un client existant ou créez-en un.");
      return;
    }
    mutation.mutate(values);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Modifier le contact" : "Nouveau contact acheteur"}
      description="Chaque contact est rattaché à une fiche client, pour le retrouver depuis la prospection."
      submitLabel="Enregistrer"
      pending={mutation.isPending}
      onSubmit={onSubmit}
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Client *" span={2}>
          <BuyerPicker value={buyer} onChange={setBuyer} />
        </Field>

        {buyer?.kind === "new" && (
          <>
            <div className="sm:col-span-2 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                «&nbsp;{buyer.fullName}&nbsp;» sera créé comme prospect. Si le
                téléphone ou l&apos;e-mail correspond à un client déjà connu, c&apos;est
                sa fiche qui sera réutilisée.
              </span>
            </div>

            <Field label="Téléphone" error={errors.newBuyerPhone?.message}>
              <Input
                inputMode="tel"
                placeholder="06 12 34 56 78"
                {...register("newBuyerPhone")}
              />
            </Field>

            <Field label="E-mail" error={errors.newBuyerEmail?.message}>
              <Input inputMode="email" {...register("newBuyerEmail")} />
            </Field>
          </>
        )}

        <Field label="Canal">
          <Select
            items={inquiryChannelLabels}
            value={channel}
            onValueChange={(v) => setChannel(v as InquiryChannelApi)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {inquiryChannels.map((c) => (
                <SelectItem key={c} value={c}>
                  {inquiryChannelLabels[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Statut">
          <Select
            items={inquiryStatusLabels}
            value={status}
            onValueChange={(v) => setStatus(v as InquiryStatusApi)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {inquiryStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {inquiryStatusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Reçu le" error={errors.receivedAt?.message}>
          <Input type="date" {...register("receivedAt")} />
        </Field>

        <Field label="Offre proposée (€)" error={errors.offerAmount?.message}>
          <Input
            type="number"
            step="50"
            min={0}
            {...register("offerAmount", {
              setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
            })}
          />
        </Field>

        <Field label="Essai prévu le" error={errors.testDriveAt?.message}>
          <Input type="date" {...register("testDriveAt")} />
        </Field>

        <Field label="Relance prévue le" error={errors.nextFollowUpAt?.message}>
          <Input type="date" {...register("nextFollowUpAt")} />
        </Field>

        {status === "Lost" && (
          <Field label="Motif de perte" error={errors.lostReason?.message} span={2}>
            <Input placeholder="Trop cher, a acheté ailleurs…" {...register("lostReason")} />
          </Field>
        )}

        <Field label="Notes" error={errors.notes?.message} span={2}>
          <Textarea rows={2} {...register("notes")} />
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
    <div
      className={
        span === 2 ? "sm:col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"
      }
    >
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
