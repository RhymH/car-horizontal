"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  channelPostStatusLabels,
  channelPostStatuses,
  knownSaleChannels,
  salesApi,
  type ChannelPostStatusApi,
  type SaleChannelPost,
} from "@/lib/api/sales";
import { channelPostFormSchema, type ChannelPostFormValues } from "@/lib/schemas/sale";
import { useSaleDossierMutation } from "@/lib/hooks/useSaleDossier";
import { dateInputToIso, toDateInput } from "@/components/sales/saleFormat";

function buildDefaults(
  post: SaleChannelPost | null,
  askingPrice: number | null,
): ChannelPostFormValues {
  return {
    channel: post?.channel ?? "",
    url: post?.url ?? "",
    externalReference: post?.externalReference ?? "",
    // Sans annonce existante, on propose le prix du dossier : c'est ce qui sera publié.
    displayedPrice: post?.displayedPrice ?? askingPrice,
    publishedAt: toDateInput(post?.publishedAt),
    notes: post?.notes ?? "",
  };
}

export function ChannelPostFormDialog({
  open,
  onOpenChange,
  vehicleId,
  askingPrice,
  post,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  askingPrice: number | null;
  post: SaleChannelPost | null;
}) {
  // Le composant est monté à l'ouverture de la modale : les valeurs initiales
  // suffisent, pas besoin de resynchroniser le formulaire dans un effet.
  const isEdit = post !== null;
  const [status, setStatus] = useState<ChannelPostStatusApi>(post?.status ?? "Online");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ChannelPostFormValues>({
    resolver: zodResolver(channelPostFormSchema),
    defaultValues: buildDefaults(post, askingPrice),
  });

  const mutation = useSaleDossierMutation(
    vehicleId,
    (values: ChannelPostFormValues) => {
      const payload = {
        channel: values.channel.trim(),
        url: values.url?.trim() || null,
        externalReference: values.externalReference?.trim() || null,
        displayedPrice: values.displayedPrice ?? null,
        publishedAt: dateInputToIso(values.publishedAt),
        notes: values.notes?.trim() || null,
        status,
      };
      return isEdit
        ? salesApi.updateChannelPost(post.id, payload)
        : salesApi.addChannelPost(vehicleId, payload);
    },
    {
      successMessage: isEdit ? "Annonce mise à jour" : "Annonce ajoutée",
      errorMessage: "Enregistrement impossible.",
      onDone: () => onOpenChange(false),
    },
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Modifier l'annonce" : "Ajouter une annonce"}
      description="Le lien vers la page où le véhicule est publié."
      submitLabel={isEdit ? "Enregistrer" : "Ajouter"}
      pending={mutation.isPending}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Site *" error={errors.channel?.message}>
          <Input
            list="sale-channel-suggestions"
            placeholder="leboncoin"
            {...register("channel")}
          />
          <datalist id="sale-channel-suggestions">
            {knownSaleChannels.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field label="Statut">
          <Select
            items={channelPostStatusLabels}
            value={status}
            onValueChange={(v) => setStatus(v as ChannelPostStatusApi)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channelPostStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {channelPostStatusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Lien" error={errors.url?.message} span={2}>
          <Input
            placeholder="https://www.leboncoin.fr/…"
            inputMode="url"
            {...register("url")}
          />
        </Field>

        <Field label="Prix affiché sur le site (€)" error={errors.displayedPrice?.message}>
          <Input
            type="number"
            step="50"
            min={0}
            {...register("displayedPrice", {
              setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
            })}
          />
          {askingPrice != null && (
            <button
              type="button"
              className="self-start text-xs text-primary hover:underline"
              onClick={() => setValue("displayedPrice", askingPrice)}
            >
              Reprendre le prix du dossier
            </button>
          )}
        </Field>

        <Field label="Publiée le" error={errors.publishedAt?.message}>
          <Input type="date" {...register("publishedAt")} />
        </Field>

        <Field label="Référence de l'annonce" error={errors.externalReference?.message} span={2}>
          <Input placeholder="Identifiant chez le site" {...register("externalReference")} />
        </Field>

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
