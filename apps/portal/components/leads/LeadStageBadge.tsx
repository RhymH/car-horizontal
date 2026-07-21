"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { leadStageLabels, leadStageTones } from "@/lib/schemas/lead";
import type { LeadStageApi } from "@/lib/api/leads";

export function LeadStageBadge({ stage }: { stage: LeadStageApi }) {
  return (
    <StatusBadge tone={leadStageTones[stage]}>
      {leadStageLabels[stage]}
    </StatusBadge>
  );
}
