"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import { timelineApi } from "@/lib/api/timeline";

export interface SnoozeTimelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: { id: string; title: string } | null;
}

export function SnoozeTimelineDialog({
  open,
  onOpenChange,
  event,
}: SnoozeTimelineDialogProps) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<number>(7);

  const handleOpenChange = (next: boolean) => {
    if (!next) setDays(7);
    onOpenChange(next);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error("No event");
      return timelineApi.snooze(event.id, days);
    },
    onSuccess: async () => {
      toast.success(`Reporté de ${days} jour(s)`);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.timeline.all(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.vehicles.all(),
        }),
      ]);
      handleOpenChange(false);
    },
    onError: (err) => {
      toast.error(extractApiErrorMessage(err, "Report impossible."));
    },
  });

  const submit = async () => {
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      toast.error("Le report doit être entre 1 et 365 jours.");
      return;
    }
    await mutation.mutateAsync();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Reporter l'événement"
      description={
        event ? `« ${event.title} » sera repoussé de ${days} jour(s).` : undefined
      }
      pending={mutation.isPending}
      onSubmit={submit}
      submitLabel="Reporter"
    >
      <div className="space-y-1">
        <Label htmlFor="snooze-days">Nombre de jours</Label>
        <Input
          id="snooze-days"
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {[3, 7, 14, 30].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className="rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent"
          >
            +{d} j
          </button>
        ))}
      </div>
    </FormDialog>
  );
}
