import { apiClient } from "@/lib/api/client";
import type { InteractionTypeApi } from "@/lib/api/customers";

export type LeadStageApi =
  | "New"
  | "Contacted"
  | "Qualified"
  | "AppointmentScheduled"
  | "Won"
  | "Lost";

export type LeadSourceApi =
  | "Unknown"
  | "Phone"
  | "WalkIn"
  | "WebForm"
  | "Marketplace"
  | "Referral"
  | "Import"
  | "Other";

export type LeadFollowUpStatusApi = "Pending" | "Done" | "Cancelled";

export interface LeadListItem {
  customerId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  tags: string[];
  stage: LeadStageApi;
  stageChangedAt: string;
  source: LeadSourceApi;
  sourceDetail: string | null;
  assignedToUserId: string | null;
  assignedToName: string | null;
  interestSummary: string | null;
  nextFollowUpAt: string | null;
  lastInteractionAt: string | null;
  vehicleCount: number;
  createdAt: string;
}

export interface LeadsListResponse {
  items: LeadListItem[];
  total: number;
  page: number;
  pageSize: number;
  overdueCount: number;
}

export interface LeadsListParams {
  search?: string;
  stage?: LeadStageApi | "Open" | "All";
  source?: LeadSourceApi | "All";
  assignedToUserId?: string;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface LeadFollowUp {
  id: string;
  customerId: string;
  dueAt: string;
  channel: InteractionTypeApi;
  note: string | null;
  status: LeadFollowUpStatusApi;
  assignedToUserId: string | null;
  assignedToName: string | null;
  completedAt: string | null;
}

export interface LeadInteraction {
  id: string;
  type: InteractionTypeApi;
  occurredAt: string;
  summary: string;
  authorUserId: string;
  authorName: string | null;
}

export interface LeadDetail {
  customerId: string;
  fullName: string;
  stage: LeadStageApi;
  stageChangedAt: string;
  source: LeadSourceApi;
  sourceDetail: string | null;
  assignedToUserId: string | null;
  assignedToName: string | null;
  interestSummary: string | null;
  lostReason: string | null;
  hasProfile: boolean;
  followUps: LeadFollowUp[];
  interactions: LeadInteraction[];
}

export interface UpdateLeadPayload {
  stage: LeadStageApi;
  source: LeadSourceApi;
  sourceDetail?: string;
  assignedToUserId?: string | null;
  interestSummary?: string;
  lostReason?: string;
}

export interface CreateFollowUpPayload {
  dueAt: string;
  channel: InteractionTypeApi;
  note?: string;
  assignedToUserId?: string | null;
}

export interface LeadTeamMember {
  userId: string;
  fullName: string;
  role: string;
}

export interface LeadDuplicateCustomer {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  notes: string | null;
  status: string;
  tags: string[];
  vehicleCount: number;
  interactionCount: number;
  createdAt: string;
}

export interface LeadDuplicateGroup {
  matchType: "Phone" | "Email";
  value: string;
  customers: LeadDuplicateCustomer[];
}

export interface MergeCustomersResponse {
  primaryCustomerId: string;
  movedVehicles: number;
  movedInteractions: number;
  movedAppointments: number;
  movedFollowUps: number;
  movedOther: number;
}

export interface LeadImportRow {
  externalRef?: string;
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  tags?: string[];
  interestSummary?: string;
  source?: string;
  sourceDetail?: string;
}

export interface LeadImportPayload {
  fileName: string;
  dryRun: boolean;
  defaultSource?: LeadSourceApi;
  rows: LeadImportRow[];
}

export interface LeadImportRowResult {
  row: number;
  fullName: string;
  action: "Created" | "Updated" | "Skipped" | "Error";
  matchedBy: "ExternalRef" | "Phone" | "Email" | null;
  message: string | null;
  customerId: string | null;
}

export interface LeadImportResult {
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  rows: LeadImportRowResult[];
}

export interface LeadStatsParams {
  from?: string;
  to?: string;
  source?: LeadSourceApi | "All";
  tag?: string;
  assignedToUserId?: string;
}

export interface LeadStatsKpis {
  newLeads: number;
  newLeadsPrev: number;
  won: number;
  wonPrev: number;
  lost: number;
  lostPrev: number;
  conversionRate: number | null;
  conversionRatePrev: number | null;
  avgDaysToConvert: number | null;
  avgDaysToConvertPrev: number | null;
  interactions: number;
  interactionsPrev: number;
  followUpsCompleted: number;
  followUpsCompletedPrev: number;
  openPipeline: number;
  overdueFollowUps: number;
}

export interface LeadStatsTimePoint {
  period: string;
  newLeads: number;
  won: number;
  lost: number;
  interactions: number;
}

export interface LeadStatsFunnelStep {
  stage: LeadStageApi;
  count: number;
}

export interface LeadStatsBreakdown {
  key: string;
  created: number;
  won: number;
  lost: number;
  open: number;
}

export interface LeadStatsUser {
  userId: string;
  name: string;
  won: number;
  open: number;
  overdueFollowUps: number;
  interactions: number;
}

export interface LeadStats {
  from: string;
  to: string;
  granularity: "day" | "week" | "month";
  kpis: LeadStatsKpis;
  timeline: LeadStatsTimePoint[];
  funnel: LeadStatsFunnelStep[];
  bySource: LeadStatsBreakdown[];
  byTag: LeadStatsBreakdown[];
  byUser: LeadStatsUser[];
  lostReasons: { reason: string; count: number }[];
  availableTags: string[];
}

export const leadsApi = {
  async list(
    params: LeadsListParams = {},
    signal?: AbortSignal,
  ): Promise<LeadsListResponse> {
    const { stage, source, ...rest } = params;
    const query: Record<string, unknown> = { ...rest };
    if (stage && stage !== "All") query.stage = stage;
    if (source && source !== "All") query.source = source;
    const { data } = await apiClient.get<LeadsListResponse>("/api/leads", {
      params: query,
      signal,
    });
    return data;
  },

  async get(customerId: string, signal?: AbortSignal): Promise<LeadDetail> {
    const { data } = await apiClient.get<LeadDetail>(
      `/api/leads/${customerId}`,
      { signal },
    );
    return data;
  },

  async update(
    customerId: string,
    payload: UpdateLeadPayload,
  ): Promise<LeadDetail> {
    const { data } = await apiClient.put<LeadDetail>(
      `/api/leads/${customerId}`,
      payload,
    );
    return data;
  },

  async addFollowUp(
    customerId: string,
    payload: CreateFollowUpPayload,
  ): Promise<LeadFollowUp> {
    const { data } = await apiClient.post<LeadFollowUp>(
      `/api/leads/${customerId}/follow-ups`,
      payload,
    );
    return data;
  },

  async completeFollowUp(
    followUpId: string,
    interactionSummary?: string,
  ): Promise<LeadFollowUp> {
    const { data } = await apiClient.post<LeadFollowUp>(
      `/api/leads/follow-ups/${followUpId}/complete`,
      { interactionSummary },
    );
    return data;
  },

  async cancelFollowUp(followUpId: string): Promise<LeadFollowUp> {
    const { data } = await apiClient.post<LeadFollowUp>(
      `/api/leads/follow-ups/${followUpId}/cancel`,
      {},
    );
    return data;
  },

  async stats(
    params: LeadStatsParams = {},
    signal?: AbortSignal,
  ): Promise<LeadStats> {
    const { source, ...rest } = params;
    const query: Record<string, unknown> = { ...rest };
    if (source && source !== "All") query.source = source;
    const { data } = await apiClient.get<LeadStats>("/api/leads/stats", {
      params: query,
      signal,
    });
    return data;
  },

  async team(signal?: AbortSignal): Promise<LeadTeamMember[]> {
    const { data } = await apiClient.get<LeadTeamMember[]>("/api/leads/team", {
      signal,
    });
    return data;
  },

  async duplicates(signal?: AbortSignal): Promise<LeadDuplicateGroup[]> {
    const { data } = await apiClient.get<{ groups: LeadDuplicateGroup[] }>(
      "/api/leads/duplicates",
      { signal },
    );
    return data.groups;
  },

  async merge(
    primaryCustomerId: string,
    duplicateCustomerId: string,
  ): Promise<MergeCustomersResponse> {
    const { data } = await apiClient.post<MergeCustomersResponse>(
      "/api/leads/merge",
      { primaryCustomerId, duplicateCustomerId },
    );
    return data;
  },

  async import(payload: LeadImportPayload): Promise<LeadImportResult> {
    const { data } = await apiClient.post<LeadImportResult>(
      "/api/leads/import",
      payload,
    );
    return data;
  },
};
