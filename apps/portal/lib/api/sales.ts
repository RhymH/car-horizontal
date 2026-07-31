import { apiClient } from "@/lib/api/client";

export type SaleStatusApi =
  | "Draft"
  | "ForSale"
  | "Reserved"
  | "Sold"
  | "Withdrawn";

export const saleStatuses: SaleStatusApi[] = [
  "Draft",
  "ForSale",
  "Reserved",
  "Sold",
  "Withdrawn",
];

export const saleStatusLabels: Record<SaleStatusApi, string> = {
  Draft: "Brouillon",
  ForSale: "En vente",
  Reserved: "Réservé",
  Sold: "Vendu",
  Withdrawn: "Retiré",
};

export type ChannelPostStatusApi =
  | "Draft"
  | "Online"
  | "Paused"
  | "Expired"
  | "Removed";

export const channelPostStatuses: ChannelPostStatusApi[] = [
  "Draft",
  "Online",
  "Paused",
  "Expired",
  "Removed",
];

export const channelPostStatusLabels: Record<ChannelPostStatusApi, string> = {
  Draft: "À publier",
  Online: "En ligne",
  Paused: "En pause",
  Expired: "Expirée",
  Removed: "Retirée",
};

export type InquiryChannelApi =
  | "Phone"
  | "Email"
  | "Sms"
  | "Marketplace"
  | "WalkIn"
  | "Referral"
  | "Other";

export const inquiryChannels: InquiryChannelApi[] = [
  "Phone",
  "Email",
  "Sms",
  "Marketplace",
  "WalkIn",
  "Referral",
  "Other",
];

export const inquiryChannelLabels: Record<InquiryChannelApi, string> = {
  Phone: "Téléphone",
  Email: "E-mail",
  Sms: "SMS",
  Marketplace: "Messagerie du site",
  WalkIn: "Visite au garage",
  Referral: "Recommandation",
  Other: "Autre",
};

export type InquiryStatusApi =
  | "New"
  | "Contacted"
  | "TestDriveScheduled"
  | "OfferMade"
  | "Negotiating"
  | "Won"
  | "Lost";

export const inquiryStatuses: InquiryStatusApi[] = [
  "New",
  "Contacted",
  "TestDriveScheduled",
  "OfferMade",
  "Negotiating",
  "Won",
  "Lost",
];

export const inquiryStatusLabels: Record<InquiryStatusApi, string> = {
  New: "Nouveau",
  Contacted: "Contacté",
  TestDriveScheduled: "Essai prévu",
  OfferMade: "Offre reçue",
  Negotiating: "Négociation",
  Won: "Vendu",
  Lost: "Perdu",
};

/** Sites d'annonces proposés en suggestion — la saisie reste libre. */
export const knownSaleChannels = [
  "leboncoin",
  "La Centrale",
  "AutoScout24",
  "ParuVendu",
  "Facebook Marketplace",
  "Site du garage",
  "Vitrine",
];

export interface SaleListing {
  id: string;
  vehicleId: string;
  status: SaleStatusApi;
  title: string | null;
  description: string | null;
  equipment: string | null;
  internalNotes: string | null;
  askingPrice: number | null;
  floorPrice: number | null;
  purchasePrice: number | null;
  reconditioningCost: number | null;
  isPriceNegotiable: boolean;
  soldPrice: number | null;
  soldAt: string | null;
  soldToCustomerId: string | null;
  soldToCustomerName: string | null;
  buyerName: string | null;
  listedAt: string | null;
  origin: string | null;
  ownersCount: number | null;
  hasServiceBook: boolean;
  hasRegistrationCertificate: boolean;
  nonPledgeCertificateAt: string | null;
  keysCount: number | null;
  warrantyMonths: number | null;
  isDamagedHistory: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalePriceChange {
  id: string;
  price: number;
  previousPrice: number | null;
  changedAt: string;
  reason: string | null;
}

export interface SaleChannelPost {
  id: string;
  channel: string;
  url: string | null;
  externalReference: string | null;
  status: ChannelPostStatusApi;
  publishedAt: string | null;
  displayedPrice: number | null;
  notes: string | null;
  priceOutOfSync: boolean;
}

export interface SalePhoto {
  id: string;
  sortOrder: number;
  caption: string | null;
  isPrimary: boolean;
  width: number;
  height: number;
  sizeBytes: number;
  originalSizeBytes: number;
  originalFileName: string;
  createdAt: string;
}

export interface SaleInquiry {
  id: string;
  /** Fiche client de l'acheteur — toujours renseignée. */
  customerId: string;
  /** Identité lue depuis la fiche client, jamais stockée sur le contact. */
  customerFullName: string;
  phone: string | null;
  email: string | null;
  channel: InquiryChannelApi;
  status: InquiryStatusApi;
  receivedAt: string;
  offerAmount: number | null;
  testDriveAt: string | null;
  nextFollowUpAt: string | null;
  lostReason: string | null;
  notes: string | null;
}

export interface RegistrationDetail {
  vehicleId: string;
  firstRegisteredAt: string | null;
  certificateIssuedAt: string | null;
  certificateFormulaNumber: string | null;
  holderName: string | null;
  holderAddress: string | null;
  typeVariantVersion: string | null;
  nationalTypeCode: string | null;
  commercialName: string | null;
  typeApprovalNumber: string | null;
  euCategory: string | null;
  nationalGenre: string | null;
  euBodyType: string | null;
  nationalBodyType: string | null;
  technicallyPermissibleMaxMassKg: number | null;
  maxMassInServiceKg: number | null;
  maxTrainMassKg: number | null;
  massInServiceKg: number | null;
  nationalEmptyMassKg: number | null;
  engineDisplacementCm3: number | null;
  maxNetPowerKw: number | null;
  fuelCode: string | null;
  fiscalHorsepower: number | null;
  powerToMassRatio: number | null;
  seatingCapacity: number | null;
  standingCapacity: number | null;
  soundLevelDb: number | null;
  engineSpeedRpm: number | null;
  co2GramsPerKm: number | null;
  emissionClass: string | null;
  lastTechnicalInspectionAt: string | null;
  technicalInspectionValidUntil: string | null;
  updatedAt: string | null;
}

export interface RegistrationRequirement {
  field: string;
  marker: string | null;
  label: string;
  level: "Required" | "Recommended";
}

export interface RegistrationReadiness {
  completionPercent: number;
  isReady: boolean;
  requiredMissingCount: number;
  recommendedMissingCount: number;
  missing: RegistrationRequirement[];
  technicalInspectionWarning: string | null;
}

export interface SaleMetrics {
  daysInStock: number | null;
  totalCost: number | null;
  estimatedMargin: number | null;
  realizedMargin: number | null;
  totalPriceDrop: number | null;
  photoCount: number;
  openInquiryCount: number;
  inquiryCount: number;
  bestOffer: number | null;
  onlinePostCount: number;
}

export interface SaleDossier {
  vehicleId: string;
  vehicleLabel: string;
  licensePlate: string | null;
  currentMileage: number;
  listing: SaleListing | null;
  priceHistory: SalePriceChange[];
  channelPosts: SaleChannelPost[];
  photos: SalePhoto[];
  inquiries: SaleInquiry[];
  registration: RegistrationDetail | null;
  registrationReadiness: RegistrationReadiness;
  metrics: SaleMetrics;
}

export interface SaleListingListItem {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  licensePlate: string | null;
  year: number | null;
  currentMileage: number;
  status: SaleStatusApi;
  askingPrice: number | null;
  estimatedMargin: number | null;
  daysInStock: number | null;
  photoCount: number;
  openInquiryCount: number;
  primaryPhotoId: string | null;
  listedAt: string | null;
}

/** Contact acheteur vu depuis la fiche client : c'est le véhicule qui est décrit. */
export interface CustomerSaleInquiry {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  licensePlate: string | null;
  askingPrice: number | null;
  vehicleSaleStatus: SaleStatusApi;
  channel: InquiryChannelApi;
  status: InquiryStatusApi;
  receivedAt: string;
  offerAmount: number | null;
  testDriveAt: string | null;
  nextFollowUpAt: string | null;
  lostReason: string | null;
  notes: string | null;
}

export interface CustomerSaleInquiriesResponse {
  items: CustomerSaleInquiry[];
  openCount: number;
}

export interface SaleListingsListResponse {
  items: SaleListingListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export type UpsertListingPayload = Partial<{
  status: SaleStatusApi;
  title: string | null;
  description: string | null;
  equipment: string | null;
  internalNotes: string | null;
  askingPrice: number | null;
  floorPrice: number | null;
  purchasePrice: number | null;
  reconditioningCost: number | null;
  isPriceNegotiable: boolean;
  soldPrice: number | null;
  soldAt: string | null;
  soldToCustomerId: string | null;
  buyerName: string | null;
  listedAt: string | null;
  origin: string | null;
  ownersCount: number | null;
  hasServiceBook: boolean;
  hasRegistrationCertificate: boolean;
  nonPledgeCertificateAt: string | null;
  keysCount: number | null;
  warrantyMonths: number | null;
  isDamagedHistory: boolean;
}>;

export interface ChangePricePayload {
  price: number;
  reason?: string;
}

export interface UpsertChannelPostPayload {
  channel: string;
  url?: string | null;
  externalReference?: string | null;
  status?: ChannelPostStatusApi;
  publishedAt?: string | null;
  displayedPrice?: number | null;
  notes?: string | null;
}

/** Identité d'un acheteur sans fiche client : le serveur la crée (ou la retrouve). */
export interface NewBuyerPayload {
  fullName: string;
  phone?: string | null;
  email?: string | null;
}

export interface UpsertInquiryPayload {
  /** Fiche existante choisie. Exclusif avec `newBuyer`. */
  customerId?: string | null;
  /** Acheteur à créer. Exclusif avec `customerId`. */
  newBuyer?: NewBuyerPayload | null;
  channel?: InquiryChannelApi;
  status?: InquiryStatusApi;
  receivedAt?: string | null;
  offerAmount?: number | null;
  testDriveAt?: string | null;
  nextFollowUpAt?: string | null;
  lostReason?: string | null;
  notes?: string | null;
}

export interface MosaicPayload {
  photoIds: string[];
  columns: number;
  rows: number;
  cellSize: number;
  gap: number;
  background: string;
  quality: number;
}

export type UpsertRegistrationPayload = Omit<
  RegistrationDetail,
  "vehicleId" | "updatedAt"
>;

export interface DossierExport {
  fileName: string;
  text: string;
}

export const salesApi = {
  async listListings(
    params: { search?: string; status?: string; page?: number; pageSize?: number } = {},
    signal?: AbortSignal,
  ): Promise<SaleListingsListResponse> {
    const { data } = await apiClient.get<SaleListingsListResponse>(
      "/api/sales/listings",
      { params, signal },
    );
    return data;
  },

  async getDossier(vehicleId: string, signal?: AbortSignal): Promise<SaleDossier> {
    const { data } = await apiClient.get<SaleDossier>(
      `/api/vehicles/${vehicleId}/sale`,
      { signal },
    );
    return data;
  },

  async upsertListing(
    vehicleId: string,
    payload: UpsertListingPayload,
  ): Promise<SaleDossier> {
    const { data } = await apiClient.put<SaleDossier>(
      `/api/vehicles/${vehicleId}/sale`,
      payload,
    );
    return data;
  },

  async deleteListing(vehicleId: string): Promise<void> {
    await apiClient.delete(`/api/vehicles/${vehicleId}/sale`);
  },

  async changePrice(
    vehicleId: string,
    payload: ChangePricePayload,
  ): Promise<SaleDossier> {
    const { data } = await apiClient.post<SaleDossier>(
      `/api/vehicles/${vehicleId}/sale/price`,
      payload,
    );
    return data;
  },

  async addChannelPost(
    vehicleId: string,
    payload: UpsertChannelPostPayload,
  ): Promise<SaleDossier> {
    const { data } = await apiClient.post<SaleDossier>(
      `/api/vehicles/${vehicleId}/sale/channel-posts`,
      payload,
    );
    return data;
  },

  async updateChannelPost(
    postId: string,
    payload: UpsertChannelPostPayload,
  ): Promise<SaleDossier> {
    const { data } = await apiClient.patch<SaleDossier>(
      `/api/sales/channel-posts/${postId}`,
      payload,
    );
    return data;
  },

  async removeChannelPost(postId: string): Promise<SaleDossier> {
    const { data } = await apiClient.delete<SaleDossier>(
      `/api/sales/channel-posts/${postId}`,
    );
    return data;
  },

  async addPhotos(vehicleId: string, files: File[]): Promise<SaleDossier> {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    const { data } = await apiClient.post<SaleDossier>(
      `/api/vehicles/${vehicleId}/sale/photos`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  async updatePhoto(
    photoId: string,
    payload: { caption?: string | null; isPrimary?: boolean },
  ): Promise<SaleDossier> {
    const { data } = await apiClient.patch<SaleDossier>(
      `/api/sales/photos/${photoId}`,
      payload,
    );
    return data;
  },

  async reorderPhotos(vehicleId: string, photoIds: string[]): Promise<SaleDossier> {
    const { data } = await apiClient.post<SaleDossier>(
      `/api/vehicles/${vehicleId}/sale/photos/reorder`,
      { photoIds },
    );
    return data;
  },

  async removePhoto(photoId: string): Promise<SaleDossier> {
    const { data } = await apiClient.delete<SaleDossier>(
      `/api/sales/photos/${photoId}`,
    );
    return data;
  },

  /**
   * Récupère le binaire d'une photo. L'API exige le jeton Bearer, donc on ne peut
   * pas pointer une balise <img> dessus : on passe par axios puis un object URL.
   */
  async fetchPhotoBlob(
    photoId: string,
    thumbnail: boolean,
    signal?: AbortSignal,
  ): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(
      `/api/sales/photos/${photoId}/content`,
      { params: { thumbnail }, responseType: "blob", signal },
    );
    return data;
  },

  async buildMosaic(vehicleId: string, payload: MosaicPayload): Promise<Blob> {
    const { data } = await apiClient.post<Blob>(
      `/api/vehicles/${vehicleId}/sale/mosaic`,
      payload,
      { responseType: "blob" },
    );
    return data;
  },

  async addInquiry(
    vehicleId: string,
    payload: UpsertInquiryPayload,
  ): Promise<SaleDossier> {
    const { data } = await apiClient.post<SaleDossier>(
      `/api/vehicles/${vehicleId}/sale/inquiries`,
      payload,
    );
    return data;
  },

  async updateInquiry(
    inquiryId: string,
    payload: UpsertInquiryPayload,
  ): Promise<SaleDossier> {
    const { data } = await apiClient.patch<SaleDossier>(
      `/api/sales/inquiries/${inquiryId}`,
      payload,
    );
    return data;
  },

  async removeInquiry(inquiryId: string): Promise<SaleDossier> {
    const { data } = await apiClient.delete<SaleDossier>(
      `/api/sales/inquiries/${inquiryId}`,
    );
    return data;
  },

  /** Contacts acheteurs d'un client, pour sa fiche client/prospect. */
  async listCustomerInquiries(
    customerId: string,
    signal?: AbortSignal,
  ): Promise<CustomerSaleInquiriesResponse> {
    const { data } = await apiClient.get<CustomerSaleInquiriesResponse>(
      `/api/customers/${customerId}/sale-inquiries`,
      { signal },
    );
    return data;
  },

  async upsertRegistration(
    vehicleId: string,
    payload: UpsertRegistrationPayload,
  ): Promise<SaleDossier> {
    const { data } = await apiClient.put<SaleDossier>(
      `/api/vehicles/${vehicleId}/registration`,
      payload,
    );
    return data;
  },

  /**
   * Récapitulatif texte du dossier. `includeInternal` ajoute prix d'achat, marge
   * et notes internes — à réserver à un usage interne, jamais à un envoi acheteur.
   */
  async exportDossier(
    vehicleId: string,
    includeInternal = false,
  ): Promise<DossierExport> {
    const { data } = await apiClient.get<DossierExport>(
      `/api/vehicles/${vehicleId}/sale/export`,
      { params: { includeInternal } },
    );
    return data;
  },
};
