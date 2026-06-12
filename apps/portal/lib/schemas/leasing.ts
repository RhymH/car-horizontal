import { z } from "zod";

export const leasingFormSchema = z
  .object({
    lessor: z
      .string()
      .min(1, { error: "Bailleur requis." })
      .max(120, { error: "120 caractères maximum." }),
    reference: z.string().max(80, { error: "80 caractères maximum." }).optional(),
    monthlyPayment: z
      .number()
      .min(0, { error: "Doit être ≥ 0." })
      .nullable()
      .optional(),
    startDate: z.string().min(1, { error: "Date de début requise." }),
    endDate: z.string().min(1, { error: "Date de fin requise." }),
    mileageCapKm: z
      .number()
      .int()
      .positive({ error: "Doit être > 0." })
      .nullable()
      .optional(),
    buyoutValue: z
      .number()
      .min(0, { error: "Doit être ≥ 0." })
      .nullable()
      .optional(),
    notes: z.string().max(2000, { error: "2000 caractères maximum." }).optional(),
  })
  .refine((d) => d.endDate > d.startDate, {
    error: "La date de fin doit être postérieure à la date de début.",
    path: ["endDate"],
  });

export type LeasingFormValues = z.infer<typeof leasingFormSchema>;
