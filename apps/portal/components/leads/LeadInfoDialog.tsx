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
import { leadsApi, type LeadDetail, type LeadSourceApi } from "@/lib/api/leads";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import {
  leadInfoFormSchema,
  leadSourceLabels,
  leadSources,
  type LeadInfoFormValues,
} from "@/lib/schemas/lead";

const NONE = "none";

export interface LeadInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadDetail;
}

export function LeadInfoDialog({ open, onOpenChange, lead }: LeadInfoDialogProps) {
  const queryClient = useQueryClient();

  const team = useQuery({
    queryKey: queryKeys.leads.team(),
    queryFn: ({ signal }) => leadsApi.team(signal),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<LeadInfoFormValues>({
    resolver: zodResolver(leadInfoFormSchema),
    mode: "onBlur",
    defaultValues: {
      source: lead.source,
      sourceDetail: lead.sourceDetail ?? "",
      assignedToUserId: lead.assignedToUserId ?? NONE,
      interestSummary: lead.interestSummary ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      source: lead.source,
      sourceDetail: lead.sourceDetail ?? "",
      assignedToUserId: lead.assignedToUserId ?? NONE,
      interestSummary: lead.interestSummary ?? "",
    });
  }, [open, lead, form]);

  const mutation = useMutation({
    mutationFn: (values: LeadInfoFormValues) =>
      leadsApi.update(lead.customerId, {
        stage: lead.stage,
        source: values.source,
        sourceDetail: values.sourceDetail?.trim() || undefined,
        assignedToUserId:
          values.assignedToUserId && values.assignedToUserId !== NONE
            ? values.assignedToUserId
            : null,
        interestSummary: values.interestSummary?.trim() || undefined,
        lostReason: lead.lostReason ?? undefined,
      }),
    onSuccess: async () => {
      toast.success("Suivi mis à jour");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.customers.detail(lead.customerId),
        }),
      ]);
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Mise à jour impossible.")),
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
          <DialogTitle>Informations de suivi</DialogTitle>
          <DialogDescription>
            D&apos;où vient ce prospect, qui s&apos;en occupe et ce qu&apos;il
            recherche.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Source
              </Label>
              <Controller
                control={form.control}
                name="source"
                render={({ field }) => (
                  <Select
                    items={leadSourceLabels}
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as LeadSourceApi)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((s) => (
                        <SelectItem key={s} value={s}>
                          {leadSourceLabels[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Précision source
              </Label>
              <Input
                placeholder="Ex. : LeBonCoin, M. Martin…"
                {...form.register("sourceDetail")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Vendeur responsable
            </Label>
            <Controller
              control={form.control}
              name="assignedToUserId"
              render={({ field }) => (
                <Select
                  items={{
                    [NONE]: "Personne",
                    ...Object.fromEntries(
                      (team.data ?? []).map((m) => [m.userId, m.fullName]),
                    ),
                  }}
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

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Projet du prospect
            </Label>
            <Textarea
              rows={3}
              placeholder="Ex. : cherche un SUV d'occasion, budget 15 000 €, décision avant l'été…"
              {...form.register("interestSummary")}
            />
            {form.formState.errors.interestSummary && (
              <span className="text-xs text-destructive">
                {form.formState.errors.interestSummary.message}
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
              Enregistrer
            </AsyncButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
