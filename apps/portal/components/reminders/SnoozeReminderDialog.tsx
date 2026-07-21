"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import { remindersApi, type Reminder } from "@/lib/api/reminders";

const PRESETS = [3, 7, 14, 30];

export interface SnoozeReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder | null;
}

export function SnoozeReminderDialog({
  open,
  onOpenChange,
  reminder,
}: SnoozeReminderDialogProps) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (open) setDays(7);
  }, [open]);

  const mutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: number }) =>
      remindersApi.snooze(id, d),
    onSuccess: async () => {
      toast.success("Rappel reporté");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reminders.all(),
      });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(extractApiErrorMessage(err, "Report impossible."));
    },
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reporter ce rappel"
      description={
        reminder
          ? `Décale la date d'envoi du rappel de N jours.`
          : undefined
      }
      submitLabel="Reporter"
      pending={mutation.isPending}
      onSubmit={async () => {
        if (!reminder) return;
        if (days < 1 || days > 365) {
          toast.error("Choisissez entre 1 et 365 jours.");
          return;
        }
        await mutation.mutateAsync({ id: reminder.id, d: days });
      }}
    >
      <Tabs value={String(days)} onValueChange={(v) => v && setDays(Number(v))}>
        <TabsList size="sm" aria-label="Report rapide">
          {PRESETS.map((d) => (
            <TabsTrigger key={d} value={String(d)}>
              +{d} j
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="space-y-1">
        <Label htmlFor="snooze-days">Jours</Label>
        <Input
          id="snooze-days"
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(Number(e.target.value) || 0)}
        />
      </div>
    </FormDialog>
  );
}
