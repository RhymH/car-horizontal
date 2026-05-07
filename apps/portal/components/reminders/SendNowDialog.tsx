"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import {
  reminderChannelLabels,
  remindersApi,
  type Reminder,
} from "@/lib/api/reminders";

export interface SendNowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder | null;
}

export function SendNowDialog({
  open,
  onOpenChange,
  reminder,
}: SendNowDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => remindersApi.sendNow(id),
    onSuccess: async () => {
      toast.success("Rappel envoyé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reminders.all(),
      });
    },
    onError: (err) => {
      toast.error(extractApiErrorMessage(err, "Envoi impossible."));
    },
  });

  const description = reminder
    ? `Le rappel sera envoyé immédiatement à ${reminder.customerFullName} via ${reminderChannelLabels[reminder.channel]}.`
    : undefined;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Envoyer ce rappel maintenant ?"
      description={description}
      confirmLabel="Envoyer"
      onConfirm={async () => {
        if (!reminder) return;
        await mutation.mutateAsync(reminder.id);
      }}
    />
  );
}
