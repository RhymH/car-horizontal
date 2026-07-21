"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { leadsApi, type LeadFollowUp } from "@/lib/api/leads";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { followUpChannelLabels } from "@/lib/schemas/lead";

export interface CompleteFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUp: LeadFollowUp;
  /** Called after success when the user asked to plan the next follow-up. */
  onPlanNext: () => void;
}

export function CompleteFollowUpDialog({
  open,
  onOpenChange,
  followUp,
  onPlanNext,
}: CompleteFollowUpDialogProps) {
  // The parent mounts this dialog per follow-up (conditional render), so the
  // state below starts fresh each time it opens — no reset effect needed.
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState("");
  const [planNext, setPlanNext] = useState(true);

  const mutation = useMutation({
    mutationFn: () =>
      leadsApi.completeFollowUp(followUp.id, summary.trim() || undefined),
    onSuccess: async () => {
      toast.success("Relance effectuée");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.customers.detail(followUp.customerId),
        }),
      ]);
      onOpenChange(false);
      if (planNext) onPlanNext();
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Opération impossible.")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Relance effectuée</DialogTitle>
          <DialogDescription>
            {followUpChannelLabels[followUp.channel]}
            {followUp.note ? ` — ${followUp.note}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Compte rendu (ajouté à l&apos;historique)
            </Label>
            <Textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Ex. : joint au téléphone, veut réfléchir jusqu'à lundi…"
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour marquer la relance comme faite sans rien
              consigner.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={planNext}
              onCheckedChange={(c) => setPlanNext(c === true)}
            />
            Planifier la prochaine relance dans la foulée
          </label>
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
          <AsyncButton
            onClick={async () => {
              await mutation.mutateAsync();
            }}
          >
            Valider
          </AsyncButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
