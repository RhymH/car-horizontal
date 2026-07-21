import { z } from "zod";

const optionalHttpUrl = z
  .string()
  .max(500, { error: "500 caractères maximum." })
  .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), {
    error: "URL http(s) invalide.",
  });

export const brandingFormSchema = z.object({
  name: z
    .string()
    .min(1, { error: "Le nom affiché est requis." })
    .max(200, { error: "200 caractères maximum." }),
  brandPrimaryColor: z
    .string()
    .refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), {
      error: "Format attendu : #RRGGBB.",
    }),
  brandLogoUrl: optionalHttpUrl,
  brandCoverImageUrl: optionalHttpUrl,
  brandTagline: z.string().max(200, { error: "200 caractères maximum." }),
  contactPhone: z.string().max(30, { error: "30 caractères maximum." }),
});

export type BrandingFormValues = z.infer<typeof brandingFormSchema>;
