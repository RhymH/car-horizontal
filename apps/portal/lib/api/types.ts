export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  organizationId?: string | null;
}

export interface LoginResponse {
  userId: string;
  activeOrganizationId: string | null;
  tokens: AuthTokens;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface RegisterResponse {
  userId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  tokens: AuthTokens;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  tokens: AuthTokens;
}

export interface SwitchOrgRequest {
  organizationId: string;
}

export interface SwitchOrgResponse {
  activeOrganizationId: string;
  tokens: AuthTokens;
}

export interface MeOrganization {
  organizationId: string;
  name: string;
  slug: string;
  role: string;
}

export interface MeResponse {
  userId: string;
  email: string;
  fullName: string;
  activeOrganizationId: string | null;
  organizations: MeOrganization[];
}

export interface ApiProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
}
