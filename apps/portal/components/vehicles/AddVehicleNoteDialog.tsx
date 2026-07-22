"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { vehiclesApi } from "@/lib/api/vehicles";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";

const schema = z.object({
  occurredAt: z.string().min(1, { error: "Date requise." }),
  body: z
    .string()
    .min(1, { error: "Écrivez votre note." })
    .max(2000),
});

type Values = z.infer<typeof schema>;

export interface AddVehicleNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
}

function defaultValues(): Values {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return {
    occurredAt: local.toISOString().slice(0, 16),
    body: "",
  };
}

export function AddVehicleNoteDialog({
  open,
  onOpenChange,
  vehicleId,
}: AddVehicleNoteDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultValues());
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      vehiclesApi.addNote(vehicleId, {
        occurredAt: new Date(values.occurredAt).toISOString(),
        body: values.body.trim(),
      }),
    onSuccess: async () => {
      toast.success("Note ajoutée");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.detail(vehicleId),
      });
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(extractApiErrorMessage(error, "Ajout impossible.")),
  });

  const submit = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    await mutation.mutateAsync(form.getValues());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle note</DialogTitle>
          <DialogDescription>
            Consignez une observation atelier ou une remarque sur ce véhicule.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Date et heure
            </Label>
            <Input type="datetime-local" {...form.register("occurredAt")} />
            {form.formState.errors.occurredAt && (
              <span className="text-xs text-destructive">
                {form.formState.errors.occurredAt.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Note
            </Label>
            <Textarea rows={4} {...form.register("body")} />
            {form.formState.errors.body && (
              <span className="text-xs text-destructive">
                {form.formState.errors.body.message}
              </span>
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
              Ajouter
            </AsyncButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
