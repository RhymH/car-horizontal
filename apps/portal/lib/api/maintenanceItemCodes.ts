import type { MaintenanceTypeApi } from "@/lib/api/maintenance";

export interface MaintenanceItemDescriptor {
  code: string;
  label: string;
  group: "Engine" | "Filters" | "Brakes" | "Tires" | "Cooling" | "Belts" | "Other";
}

export const maintenanceItemCatalog: MaintenanceItemDescriptor[] = [
  { code: "oil_change", label: "Vidange + filtre huile", group: "Engine" },
  { code: "cabin_filter", label: "Filtre habitacle", group: "Filters" },
  { code: "air_filter", label: "Filtre à air", group: "Filters" },
  { code: "fuel_filter", label: "Filtre carburant", group: "Filters" },
  { code: "spark_plugs", label: "Bougies d'allumage", group: "Engine" },
  { code: "glow_plugs", label: "Bougies de préchauffage", group: "Engine" },
  { code: "brake_fluid", label: "Liquide de frein", group: "Brakes" },
  { code: "brake_pads_front", label: "Plaquettes de frein avant", group: "Brakes" },
  { code: "brake_pads_rear", label: "Plaquettes de frein arrière", group: "Brakes" },
  { code: "brake_discs_front", label: "Disques de frein avant", group: "Brakes" },
  { code: "brake_discs_rear", label: "Disques de frein arrière", group: "Brakes" },
  { code: "timing_belt", label: "Courroie de distribution", group: "Belts" },
  { code: "accessory_belt", label: "Courroie d'accessoire", group: "Belts" },
  { code: "coolant", label: "Liquide de refroidissement", group: "Cooling" },
  { code: "ac_service", label: "Climatisation (recharge)", group: "Cooling" },
  { code: "transmission_fluid", label: "Boîte de vitesses (huile)", group: "Other" },
  { code: "differential_fluid", label: "Différentiel (huile)", group: "Other" },
  { code: "tire_rotation", label: "Permutation des pneus", group: "Tires" },
  { code: "tire_replacement", label: "Pneus (remplacement)", group: "Tires" },
  { code: "wipers", label: "Essuie-glaces", group: "Other" },
  { code: "battery_check", label: "Batterie (test)", group: "Other" },
  { code: "power_steering_fluid", label: "Direction assistée (liquide)", group: "Other" },
  { code: "dpf_regen", label: "Régénération FAP", group: "Engine" },
  { code: "technical_inspection", label: "Contrôle technique", group: "Other" },
];

export const maintenanceItemLabel = (code: string): string =>
  maintenanceItemCatalog.find((i) => i.code === code)?.label ?? code;

export const defaultItemCodesForType: Record<MaintenanceTypeApi, string[]> = {
  Oil: ["oil_change"],
  Tires: ["tire_replacement"],
  Brakes: ["brake_pads_front", "brake_discs_front"],
  FullService: ["oil_change", "cabin_filter", "air_filter", "brake_fluid"],
  TechnicalInspection: ["technical_inspection"],
  Custom: [],
};
