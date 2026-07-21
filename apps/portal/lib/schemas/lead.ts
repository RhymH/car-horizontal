import { z } from "zod";
import type { LeadSourceApi, LeadStageApi } from "@/lib/api/leads";
import type { InteractionTypeApi } from "@/lib/api/customers";

export const leadStages = [
  "New",
  "Contacted",
  "Qualified",
  "AppointmentScheduled",
  "Won",
  "Lost",
] as const;

export const leadStageLabels: Record<LeadStageApi, string> = {
  New: "Nouveau",
  Contacted: "Contacté",
  Qualified: "Qualifié",
  AppointmentScheduled: "RDV pris",
  Won: "Gagné",
  Lost: "Perdu",
};

export const openLeadStages: LeadStageApi[] = [
  "New",
  "Contacted",
  "Qualified",
  "AppointmentScheduled",
];

export const leadStageTones: Record<
  LeadStageApi,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  New: "info",
  Contacted: "neutral",
  Qualified: "warning",
  AppointmentScheduled: "success",
  Won: "success",
  Lost: "danger",
};

export const leadSources = [
  "Phone",
  "WalkIn",
  "WebForm",
  "Marketplace",
  "Referral",
  "Import",
  "Other",
  "Unknown",
] as const;

export const leadSourceLabels: Record<LeadSourceApi, string> = {
  Unknown: "Inconnue",
  Phone: "Appel entrant",
  WalkIn: "Passage au garage",
  WebForm: "Formulaire web",
  Marketplace: "Petites annonces",
  Referral: "Recommandation",
  Import: "Import",
  Other: "Autre",
};

export const followUpChannels: InteractionTypeApi[] = [
  "Call",
  "Sms",
  "Email",
  "Visit",
  "Note",
];

export const followUpChannelLabels: Record<InteractionTypeApi, string> = {
  Call: "Appel",
  Sms: "SMS",
  Email: "Email",
  Visit: "Visite",
  Note: "Autre",
};

export const leadInfoFormSchema = z.object({
  source: z.enum(leadSources),
  sourceDetail: z.string().max(200).optional(),
  assignedToUserId: z.string().optional(),
  interestSummary: z.string().max(2000).optional(),
});

export type LeadInfoFormValues = z.infer<typeof leadInfoFormSchema>;

export const followUpFormSchema = z.object({
  dueAt: z.string().min(1, { error: "Date de relance requise." }),
  channel: z.enum(["Call", "Sms", "Email", "Visit", "Note"]),
  note: z.string().max(1000).optional(),
  assignedToUserId: z.string().optional(),
});

export type FollowUpFormValues = z.infer<typeof followUpFormSchema>;
