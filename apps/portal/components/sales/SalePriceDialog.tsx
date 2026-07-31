"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDialog } from "@/components/ui/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { salesApi, type SaleDossier } from "@/lib/api/sales";
import { salePriceFormSchema, type SalePriceFormValues } from "@/lib/schemas/sale";
import { useSaleDossierMutation } from "@/lib/hooks/useSaleDossier";
import { money } from "@/components/sales/saleFormat";

/**
 * Changement du prix affiché. Le motif est facultatif mais fortement suggéré :
 * c'est lui qui rend l'historique lisible trois mois plus tard.
 */
export function SalePriceDialog({
  open,
  onOpenChange,
  dossier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: SaleDossier;
}) {
  const current = dossier.listing?.askingPrice ?? null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SalePriceFormValues>({
    resolver: zodResolver(salePriceFormSchema),
    defaultValues: { price: current ?? 0, reason: "" },
  });

  useEffect(() => {
    if (open) reset({ price: current ?? 0, reason: "" });
  }, [open, current, reset]);

  const mutation = useSaleDossierMutation(
    dossier.vehicleId,
    (values: SalePriceFormValues) =>
      salesApi.changePrice(dossier.vehicleId, {
        price: values.price,
        reason: values.reason?.trim() || undefined,
      }),
    {
      successMessage: "Prix mis à jour",
      errorMessage: "Changement de prix impossible.",
      onDone: () => onOpenChange(false),
    },
  );

  const nextPrice = watch("price");
  const delta =
    current != null && typeof nextPrice === "number" ? nextPrice - current : null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Changer le prix"
      description={
        current != null ? `Prix actuel : ${money(current)}` : "Premier prix affiché"
      }
      submitLabel="Enregistrer le prix"
      pending={mutation.isPending}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Nouveau prix (€) *
        </Label>
        <Input
          type="number"
          step="50"
          min={0}
          autoFocus
          {...register("price", {
            setValueAs: (v) => (v === "" || v == null ? 0 : Number(v)),
          })}
        />
        {errors.price && (
          <span className="text-xs text-destructive">{errors.price.message}</span>
        )}
        {delta != null && delta !== 0 && (
          <span className="text-xs text-muted-foreground">
            {delta < 0 ? "Baisse" : "Hausse"} de {money(Math.abs(delta))}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Motif
        </Label>
        <Textarea
          rows={2}
          placeholder="Peu d'appels depuis 3 semaines, alignement sur la concurrence…"
          {...register("reason")}
        />
        {errors.reason && (
          <span className="text-xs text-destructive">{errors.reason.message}</span>
        )}
      </div>
    </FormDialog>
  );
}
