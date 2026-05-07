import { z } from "zod";

export const engineTypes = [
  "Gasoline",
  "Diesel",
  "Hybrid",
  "Electric",
  "LPG",
] as const;
export type EngineType = (typeof engineTypes)[number];

export const transmissionTypes = ["Manual", "Automatic", "Semi-Auto"] as const;
export type Transmission = (typeof transmissionTypes)[number];

export const transmissionLabels: Record<Transmission, string> = {
  Manual: "Manuelle",
  Automatic: "Automatique",
  "Semi-Auto": "Semi-automatique",
};

const MIN_YEAR = 1950;
const MAX_YEAR = new Date().getFullYear() + 1;

export const vehicleFormSchema = z.object({
  customerId: z
    .string()
    .min(1, { error: "Sélectionnez un client." }),
  make: z
    .string()
    .min(1, { error: "Marque requise." })
    .max(80, { error: "80 caractères maximum." }),
  model: z
    .string()
    .min(1, { error: "Modèle requis." })
    .max(80, { error: "80 caractères maximum." }),
  year: z
    .number()
    .int()
    .min(MIN_YEAR, { error: `Année ≥ ${MIN_YEAR}.` })
    .max(MAX_YEAR, { error: `Année ≤ ${MAX_YEAR}.` })
    .nullable()
    .optional(),
  licensePlate: z
    .string()
    .max(20, { error: "20 caractères maximum." })
    .optional(),
  vin: z.string().max(40).optional(),
  color: z.string().max(40).optional(),
  engineType: z.enum(engineTypes).nullable().optional(),
  transmissionType: z.string().max(40).optional(),
  purchasedAt: z.string().optional(),
  currentMileage: z
    .number({ error: "Kilométrage requis." })
    .int()
    .min(0, { error: "Doit être ≥ 0." }),
  photoFileId: z.string().optional(),
  vehicleModelId: z.string().nullish(),
  selectedProgramId: z.string().nullish(),
  vehicleModelLabel: z.string().nullish(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
