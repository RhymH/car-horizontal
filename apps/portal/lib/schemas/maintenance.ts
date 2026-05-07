import { z } from "zod";
import { maintenanceTypes } from "@/lib/api/maintenance";

export const maintenanceFormSchema = z
  .object({
    performedAt: z
      .string()
      .min(1, { error: "Date requise." }),
    type: z.enum(maintenanceTypes),
    description: z.string().max(2000).optional(),
    mileageAtService: z
      .number({ error: "Kilométrage requis." })
      .int()
      .min(0, { error: "Doit être ≥ 0." }),
    cost: z
      .number()
      .min(0, { error: "Doit être ≥ 0." })
      .optional(),
    mechanicName: z.string().max(120).optional(),
    nextDueAt: z.string().optional(),
    nextDueMileage: z
      .number()
      .int()
      .positive({ error: "Doit être > 0." })
      .optional(),
  })
  .refine(
    (v) => {
      if (!v.performedAt) return true;
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return new Date(v.performedAt) <= today;
    },
    {
      error: "La date ne peut pas être dans le futur.",
      path: ["performedAt"],
    },
  );

export type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;
