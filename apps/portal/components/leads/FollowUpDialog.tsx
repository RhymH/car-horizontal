"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { leadsApi } from "@/lib/api/leads";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import {
  followUpChannelLabels,
  followUpChannels,
  followUpFormSchema,
  type FollowUpFormValues,
} from "@/lib/schemas/lead";
import type { InteractionTypeApi } from "@/lib/api/customers";

const NONE = "none";

const DUE_PRESETS: { label: string; days: number }[] = [
  { label: "Demain", days: 1 },
  { label: "Dans 3 jours", days: 3 },
  { label: "Dans 1 semaine", days: 7 },
  { label: "Dans 1 mois", days: 30 },
];

function toLocalInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return toLocalInputValue(d);
}

export interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string;
}

export function FollowUpDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
}: FollowUpDialogProps) {
  const queryClient = useQueryClient();

  const team = useQuery({
    queryKey: queryKeys.leads.team(),
    queryFn: ({ signal }) => leadsApi.team(signal),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpFormSchema),
    mode: "onBlur",
    defaultValues: { dueAt: inDays(1), channel: "Call", note: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ dueAt: inDays(1), channel: "Call", note: "" });
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (values: FollowUpFormValues) =>
      leadsApi.addFollowUp(customerId, {
        dueAt: new Date(values.dueAt).toISOString(),
        channel: values.channel,
        note: values.note?.trim() || undefined,
        assignedToUserId:
          values.assignedToUserId && values.assignedToUserId !== NONE
            ? values.assignedToUserId
            : undefined,
      }),
    onSuccess: async () => {
      toast.success("Relance planifiée");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.customers.detail(customerId),
        }),
      ]);
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Planification impossible.")),
  });

  const submit = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    await mutation.mutateAsync(form.getValues());
  };

  const teamItems: Record<string, string> = {
    [NONE]: "Personne",
    ...Object.fromEntries(
      (team.data ?? []).map((m) => [m.userId, m.fullName]),
    ),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planifier une relance</DialogTitle>
          <DialogDescription>
            {customerName
              ? `Programmez la prochaine action pour ${customerName}.`
              : "Programmez la prochaine action pour ce prospect."}{" "}
            Un prospect sans relance planifiée finit oublié.
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
              Quand
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {DUE_PRESETS.map((p) => (
                <Button
                  key={p.days}
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    form.setValue("dueAt", inDays(p.days), {
                      shouldValidate: true,
                    })
                  }
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <Input type="datetime-local" {...form.register("dueAt")} />
            {form.formState.errors.dueAt && (
              <span className="text-xs text-destructive">
                {form.formState.errors.dueAt.message}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Canal
              </Label>
              <Controller
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <Select
                    items={followUpChannelLabels}
                    value={field.value}
                    onValueChange={(v) =>
                      field.onChange(v as InteractionTypeApi)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {followUpChannels.map((c) => (
                        <SelectItem key={c} value={c}>
                          {followUpChannelLabels[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Assignée à
              </Label>
              <Controller
                control={form.control}
                name="assignedToUserId"
                render={({ field }) => (
                  <Select
                    items={teamItems}
                    value={field.value ?? NONE}
                    onValueChange={(v) => field.onChange(v ?? NONE)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Personne</SelectItem>
                      {(team.data ?? []).map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Objet de la relance
            </Label>
            <Textarea
              rows={3}
              placeholder="Ex. : rappeler pour l'essai de la Clio, envoyer le devis…"
              {...form.register("note")}
            />
            {form.formState.errors.note && (
              <span className="text-xs text-destructive">
                {form.formState.errors.note.message}
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
              Planifier
            </AsyncButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
