import { z } from "zod";
import { reminderChannels } from "@/lib/api/reminders";

export const reminderFormSchema = z.object({
  customerId: z.string().min(1, { error: "Sélectionnez un client." }),
  vehicleId: z.string().optional(),
  channel: z.enum(reminderChannels),
  scheduledAt: z.string().min(1, { error: "Date d'envoi requise." }),
  resolvedSubject: z.string().max(200).optional(),
  resolvedBody: z.string().max(4000).optional(),
});

export type ReminderFormValues = z.infer<typeof reminderFormSchema>;
