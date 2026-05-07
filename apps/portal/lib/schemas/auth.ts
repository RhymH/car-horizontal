import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "Adresse e-mail invalide." }),
  password: z.string().min(1, { error: "Mot de passe requis." }),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, { error: "Indiquez votre nom complet." })
    .max(120),
  email: z.email({ error: "Adresse e-mail invalide." }),
  password: z
    .string()
    .min(8, { error: "Au moins 8 caractères." })
    .regex(/[a-zA-Z]/, { error: "Au moins une lettre." })
    .regex(/[0-9]/, { error: "Au moins un chiffre." }),
});

export type RegisterValues = z.infer<typeof registerSchema>;

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["Très faible", "Faible", "Correct", "Bon", "Excellent"];
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] };
}
