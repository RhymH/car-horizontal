import type { ApiProblemDetails } from "@/lib/api/types";

interface ErrorWithResponse {
  response?: {
    data?: ApiProblemDetails | string | null;
    status?: number;
  };
  message?: string;
}

export function extractApiErrorMessage(
  error: unknown,
  fallback = "Une erreur est survenue.",
): string {
  const e = error as ErrorWithResponse;
  const data = e?.response?.data;
  if (data && typeof data === "object") {
    if (data.detail) return data.detail;
    if (data.title) return data.title;
    if (data.errors) {
      const flat = Object.values(data.errors).flat().filter(Boolean);
      if (flat.length > 0) return flat.join(" ");
    }
  }
  if (typeof data === "string" && data.trim().length > 0) return data;
  if (e?.message && e.message !== "Network Error") return e.message;
  return fallback;
}
