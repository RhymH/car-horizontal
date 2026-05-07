"use client";

import { Mail, MessageSquare, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  reminderChannelLabels,
  reminderStatusLabels,
  type Reminder,
  type ReminderChannelApi,
} from "@/lib/api/reminders";
import { reminderStatusTone } from "@/components/reminders/reminderTones";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const CHANNEL_ICON: Record<ReminderChannelApi, typeof Mail> = {
  Email: Mail,
  Sms: Smartphone,
  Both: MessageSquare,
};

export interface ReminderPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder | null;
}

export function ReminderPreviewDialog({
  open,
  onOpenChange,
  reminder,
}: ReminderPreviewDialogProps) {
  if (!reminder) return null;
  const Icon = CHANNEL_ICON[reminder.channel] ?? Mail;
  const subject = reminder.resolvedSubject?.trim();
  const body = reminder.resolvedBody?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-4" />
            Aperçu du rappel
          </DialogTitle>
          <DialogDescription>
            Contenu exact qui sera envoyé via{" "}
            {reminderChannelLabels[reminder.channel]}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Destinataire : </span>
              <span className="font-medium">{reminder.customerFullName}</span>
            </div>
            {reminder.vehicleLabel && (
              <div>
                <span className="text-muted-foreground">Véhicule : </span>
                <span className="font-medium">
                  {reminder.licensePlate
                    ? `${reminder.licensePlate} · `
                    : ""}
                  {reminder.vehicleLabel}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Programmé : </span>
              <span className="font-medium">
                {dateFormatter.format(new Date(reminder.scheduledAt))}
              </span>
            </div>
            <StatusBadge tone={reminderStatusTone[reminder.status]}>
              {reminderStatusLabels[reminder.status]}
            </StatusBadge>
          </div>

          {(reminder.channel === "Email" || reminder.channel === "Both") && (
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                Email
              </div>
              <div className="space-y-2 p-3">
                <div className="text-sm">
                  <span className="font-semibold">Sujet : </span>
                  {subject ?? (
                    <span className="italic text-muted-foreground">
                      (vide — sera résolu via template en Phase 9)
                    </span>
                  )}
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
                  {body ?? "(corps non renseigné)"}
                </pre>
              </div>
            </div>
          )}

          {(reminder.channel === "Sms" || reminder.channel === "Both") && (
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                SMS
              </div>
              <div className="p-3">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {body ?? "(corps non renseigné)"}
                </pre>
              </div>
            </div>
          )}

          {reminder.failureReason && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <strong>Échec : </strong>
              {reminder.failureReason}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
