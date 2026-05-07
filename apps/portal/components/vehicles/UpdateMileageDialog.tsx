"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { vehiclesApi, type VehicleDetail } from "@/lib/api/vehicles";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";

const numberFormatter = new Intl.NumberFormat("fr-FR");

export interface UpdateMileageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleDetail;
}

export function UpdateMileageDialog({
  open,
  onOpenChange,
  vehicle,
}: UpdateMileageDialogProps) {
  const queryClient = useQueryClient();
  const [mileage, setMileage] = useState<string>(String(vehicle.currentMileage));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMileage(String(vehicle.currentMileage));
    setNote("");
    setError(null);
  }, [open, vehicle.currentMileage]);

  const mutation = useMutation({
    mutationFn: (payload: { mileage: number; note?: string }) =>
      vehiclesApi.updateMileage(vehicle.id, payload),
    onSuccess: async () => {
      toast.success("Kilométrage mis à jour");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.detail(vehicle.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.all(),
      });
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error(extractApiErrorMessage(e, "Mise à jour impossible."));
    },
  });

  const submit = async () => {
    const value = Number(mileage);
    if (!Number.isFinite(value) || value < 0) {
      setError("Le kilométrage doit être un nombre positif.");
      return;
    }
    if (value < vehicle.currentMileage) {
      setError(
        `Le nouveau kilométrage doit être ≥ ${numberFormatter.format(
          vehicle.currentMileage,
        )} km (valeur actuelle).`,
      );
      return;
    }
    setError(null);
    await mutation.mutateAsync({
      mileage: value,
      note: note.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mettre à jour le kilométrage</DialogTitle>
          <DialogDescription>
            Valeur actuelle :{" "}
            {numberFormatter.format(vehicle.currentMileage)} km. Une note sera
            ajoutée à l'historique d'interactions du client.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nouveau kilométrage *
            </Label>
            <Input
              type="number"
              min={vehicle.currentMileage}
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              autoFocus
            />
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Note (optionnelle)
            </Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Relevé après vidange…"
              maxLength={500}
            />
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
      </DialogContent>
    </Dialog>
  );
}
