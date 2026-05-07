import { z } from "zod";

export const appointmentFormSchema = z.object({
  customerId: z.string().min(1, { error: "Sélectionnez un client." }),
  vehicleId: z.string().optional(),
  subject: z
    .string()
    .min(1, { error: "Sujet requis." })
    .max(200, { error: "Sujet trop long." }),
  scheduledAt: z.string().min(1, { error: "Date requise." }),
  durationMinutes: z
    .number({ error: "Durée invalide." })
    .int()
    .min(5, { error: "Minimum 5 minutes." })
    .max(480, { error: "Maximum 8 heures." }),
  notes: z.string().max(2000).optional(),
});

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;
