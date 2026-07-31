import { z } from "zod";

export const customerStatuses = ["Active", "Inactive", "Lost", "Prospect"] as const;
export type CustomerStatus = (typeof customerStatuses)[number];

// Tolerant phone matcher: 6–15 digits, optional leading + or 00,
// allow spaces / dots / dashes / parentheses as separators.
const phoneDigitCount = (v: string) => v.replace(/\D/g, "").length;

const optionalEmail = z
  .string()
  .max(200)
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    error: "Adresse e-mail invalide.",
  })
  .optional();

const optionalPhone = z
  .string()
  .max(32, { error: "32 caractères maximum." })
  .refine(
    (v) => {
      if (v === "") return true;
      // accepted characters: digits, +, spaces, dots, dashes, parens
      if (!/^[\d+\s.\-()]+$/.test(v)) return false;
      const digits = phoneDigitCount(v);
      return digits >= 6 && digits <= 15;
    },
    { error: "Numéro de téléphone invalide." },
  )
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
  // "" = aucun commercial assigné (le Select ne peut pas porter null).
  salespersonUserId: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const customerStatusLabels: Record<CustomerStatus, string> = {
  Active: "Actif",
  Inactive: "Inactif",
  Lost: "Perdu",
  Prospect: "Prospect",
};

export function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const t = value.trim();
  return t.length === 0 ? undefined : t;
}
