import { z } from "zod";

export const customerStatuses = ["Active", "Inactive", "Lost"] as const;
export type CustomerStatus = (typeof customerStatuses)[number];

const phonePattern = /^\+[1-9]\d{6,14}$/;

const optionalEmail = z
  .string()
  .max(200)
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    error: "Adresse e-mail invalide.",
  })
  .optional();

const optionalPhone = z
  .string()
  .refine((v) => v === "" || phonePattern.test(v), {
    error: "Format E.164 attendu (ex. +33612345678).",
  })
  .optional();

export const customerFormSchema = z.object({
  fullName: z
    .string()
    .min(2, { error: "Au moins 2 caractères." })
    .max(150, { error: "150 caractères maximum." }),
  email: optionalEmail,
  phone: optionalPhone,
  address: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  postalCode: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
  acquiredAt: z
    .string()
    .min(1, { error: "Date d'acquisition requise." }),
  status: z.enum(customerStatuses),
  tags: z.array(z.string().min(1).max(40)),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const customerStatusLabels: Record<CustomerStatus, string> = {
  Active: "Actif",
  Inactive: "Inactif",
  Lost: "Perdu",
};

export function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const t = value.trim();
  return t.length === 0 ? undefined : t;
}
