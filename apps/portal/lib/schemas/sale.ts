import { z } from "zod";

/** Champ numérique optionnel : "" et null passent, sinon nombre ≥ 0. */
const optionalMoney = z
  .number()
  .min(0, { error: "Doit être ≥ 0." })
  .nullable()
  .optional();

const optionalCount = (max: number) =>
  z
    .number()
    .int({ error: "Nombre entier attendu." })
    .min(0, { error: "Doit être ≥ 0." })
    .max(max, { error: `Doit être ≤ ${max}.` })
    .nullable()
    .optional();

export const saleListingFormSchema = z
  .object({
    title: z.string().max(200, { error: "200 caractères maximum." }).optional(),
    description: z.string().max(8000, { error: "8000 caractères maximum." }).optional(),
    equipment: z.string().max(4000, { error: "4000 caractères maximum." }).optional(),
    internalNotes: z.string().max(4000, { error: "4000 caractères maximum." }).optional(),
    askingPrice: optionalMoney,
    floorPrice: optionalMoney,
    purchasePrice: optionalMoney,
    reconditioningCost: optionalMoney,
    origin: z.string().max(120, { error: "120 caractères maximum." }).optional(),
    ownersCount: optionalCount(50),
    keysCount: optionalCount(10),
    warrantyMonths: optionalCount(120),
    nonPledgeCertificateAt: z.string().optional(),
    listedAt: z.string().optional(),
    soldPrice: optionalMoney,
    soldAt: z.string().optional(),
    buyerName: z.string().max(160, { error: "160 caractères maximum." }).optional(),
  })
  // Le plancher au-dessus du prix affiché est presque toujours une inversion de
  // saisie : on le signale ici plutôt que d'attendre le 400 du serveur.
  .refine(
    (d) =>
      d.floorPrice == null || d.askingPrice == null || d.floorPrice <= d.askingPrice,
    {
      error: "Le prix plancher doit être inférieur ou égal au prix affiché.",
      path: ["floorPrice"],
    },
  );

export type SaleListingFormValues = z.infer<typeof saleListingFormSchema>;

export const salePriceFormSchema = z.object({
  price: z
    .number({ error: "Prix requis." })
    .min(0, { error: "Doit être ≥ 0." }),
  reason: z.string().max(500, { error: "500 caractères maximum." }).optional(),
});

export type SalePriceFormValues = z.infer<typeof salePriceFormSchema>;

export const channelPostFormSchema = z.object({
  channel: z
    .string()
    .min(1, { error: "Site requis." })
    .max(80, { error: "80 caractères maximum." }),
  url: z
    .string()
    .max(2000, { error: "2000 caractères maximum." })
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), {
      error: "Le lien doit commencer par http:// ou https://.",
    }),
  externalReference: z.string().max(120, { error: "120 caractères maximum." }).optional(),
  displayedPrice: optionalMoney,
  publishedAt: z.string().optional(),
  notes: z.string().max(1000, { error: "1000 caractères maximum." }).optional(),
});

export type ChannelPostFormValues = z.infer<typeof channelPostFormSchema>;

/**
 * Contact acheteur. L'identité n'est pas dans ce schéma : elle vient du sélecteur
 * de client (fiche existante ou création). Seules les coordonnées d'un acheteur
 * *nouveau* sont saisies ici, pour alimenter la fiche créée.
 */
export const inquiryFormSchema = z.object({
  newBuyerPhone: z.string().max(40, { error: "40 caractères maximum." }).optional(),
  newBuyerEmail: z
    .string()
    .max(200, { error: "200 caractères maximum." })
    .optional()
    .refine((v) => !v || z.email().safeParse(v).success, {
      error: "Adresse e-mail invalide.",
    }),
  offerAmount: optionalMoney,
  receivedAt: z.string().optional(),
  testDriveAt: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  lostReason: z.string().max(500, { error: "500 caractères maximum." }).optional(),
  notes: z.string().max(2000, { error: "2000 caractères maximum." }).optional(),
});

export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;

const optionalInt = (min: number, max: number) =>
  z
    .number()
    .int({ error: "Nombre entier attendu." })
    .min(min, { error: `Doit être ≥ ${min}.` })
    .max(max, { error: `Doit être ≤ ${max}.` })
    .nullable()
    .optional();

/**
 * Saisie de la carte grise. Les bornes reprennent celles du serveur : elles
 * servent à attraper une faute de frappe (un zéro de trop sur une masse), pas à
 * contraindre le document.
 */
export const registrationFormSchema = z.object({
  firstRegisteredAt: z.string().optional(),
  certificateIssuedAt: z.string().optional(),
  certificateFormulaNumber: z.string().max(40).optional(),
  holderName: z.string().max(160).optional(),
  holderAddress: z.string().max(300).optional(),
  typeVariantVersion: z.string().max(60).optional(),
  nationalTypeCode: z.string().max(40).optional(),
  commercialName: z.string().max(80).optional(),
  typeApprovalNumber: z.string().max(60).optional(),
  euCategory: z.string().max(10).optional(),
  nationalGenre: z.string().max(10).optional(),
  euBodyType: z.string().max(10).optional(),
  nationalBodyType: z.string().max(40).optional(),
  technicallyPermissibleMaxMassKg: optionalInt(1, 60000),
  maxMassInServiceKg: optionalInt(1, 60000),
  maxTrainMassKg: optionalInt(1, 60000),
  massInServiceKg: optionalInt(1, 60000),
  nationalEmptyMassKg: optionalInt(1, 60000),
  engineDisplacementCm3: optionalInt(1, 30000),
  maxNetPowerKw: z
    .number()
    .min(0.1, { error: "Doit être > 0." })
    .max(2000, { error: "Doit être ≤ 2000." })
    .nullable()
    .optional(),
  fuelCode: z.string().max(10).optional(),
  fiscalHorsepower: optionalInt(1, 100),
  powerToMassRatio: z.number().min(0).max(100).nullable().optional(),
  seatingCapacity: optionalInt(1, 100),
  standingCapacity: optionalInt(0, 200),
  soundLevelDb: optionalInt(0, 200),
  engineSpeedRpm: optionalInt(0, 20000),
  co2GramsPerKm: optionalInt(0, 1000),
  emissionClass: z.string().max(40).optional(),
  lastTechnicalInspectionAt: z.string().optional(),
  technicalInspectionValidUntil: z.string().optional(),
});

export type RegistrationFormValues = z.infer<typeof registrationFormSchema>;
