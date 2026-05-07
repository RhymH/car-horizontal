import { z } from "zod";
import { timelineEventKinds } from "@/lib/api/timeline";

export const timelineEventFormSchema = z
  .object({
    vehicleId: z.string().min(1, { error: "Sélectionnez un véhicule." }),
    kind: z.enum(timelineEventKinds),
    title: z.string().min(1, { error: "Titre requis." }).max(200),
    description: z.string().max(2000).optional(),
    dueAt: z.string().optional(),
    dueMileage: z
      .number()
      .int()
      .positive({ error: "Doit être > 0." })
      .optional(),
  })
  .refine((v) => Boolean(v.dueAt) || v.dueMileage !== undefined, {
    error: "Renseignez une date d'échéance ou un kilométrage cible.",
    path: ["dueAt"],
  });

export type TimelineEventFormValues = z.infer<typeof timelineEventFormSchema>;
