"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customersApi, type InteractionTypeApi } from "@/lib/api/customers";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";

const interactionTypes: InteractionTypeApi[] = [
  "Call",
  "Visit",
  "Sms",
  "Email",
  "Note",
];

export const interactionTypeLabels: Record<InteractionTypeApi, string> = {
  Call: "Appel",
  Visit: "Visite",
  Sms: "SMS",
  Email: "Email",
  Note: "Note",
};

const schema = z.object({
  type: z.enum(["Call", "Visit", "Sms", "Email", "Note"]),
  occurredAt: z.string().min(1, { error: "Date requise." }),
  summary: z
    .string()
    .min(1, { error: "Ajoutez un résumé." })
    .max(2000),
});

type Values = z.infer<typeof schema>;

export interface AddInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}

function defaultValues(): Values {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return {
    type: "Note",
    occurredAt: local.toISOString().slice(0, 16),
    summary: "",
  };
}

export function AddInteractionDialog({
  open,
  onOpenChange,
  customerId,
}: AddInteractionDialogProps) {
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
      customersApi.addInteraction(customerId, {
        type: values.type,
        occurredAt: new Date(values.occurredAt).toISOString(),
        summary: values.summary.trim(),
      }),
    onSuccess: async () => {
      toast.success("Interaction ajoutée");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(customerId),
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
          <DialogTitle>Nouvelle interaction</DialogTitle>
          <DialogDescription>
            Loggez un appel, une visite ou une note pour ce client.
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
              Type
            </Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  items={interactionTypeLabels}
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as InteractionTypeApi)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {interactionTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {interactionTypeLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

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
              Résumé
            </Label>
            <Textarea rows={4} {...form.register("summary")} />
            {form.formState.errors.summary && (
              <span className="text-xs text-destructive">
                {form.formState.errors.summary.message}
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
