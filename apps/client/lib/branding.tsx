"use client";

/**
 * Theming marque blanche du portail client.
 *
 * Chaque garage personnalise couleur d'accent, logo, image d'ambiance et
 * signature. Le provider résout la marque dans cet ordre :
 *   1. cache localStorage (affichage instantané au retour du client),
 *   2. ?garage=<slug> dans l'URL (lien de connexion thémé, avant auth),
 *   3. branding authentifié (/api/portal/branding) une fois connecté.
 * La couleur est appliquée en variables CSS (--brand / --brand-ink) sur <html>,
 * consommées par le thème Tailwind (color-brand).
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { portalApi, type PortalBranding } from "@/lib/api/portal";
import { tokenStore } from "@/lib/auth/tokens";

const CACHE_KEY = "ch_client_branding";
export const DEFAULT_ACCENT = "#c9a227";

function readCache(): PortalBranding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PortalBranding) : null;
  } catch {
    return null;
  }
}

function writeCache(branding: PortalBranding) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(branding));
  } catch {
    // stockage indisponible : theming non persisté, sans gravité
  }
}

/** Encre lisible (sombre ou claire) posée sur la couleur d'accent. */
function contrastInk(hex: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return "#0d0e11";
  const n = parseInt(match[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#0d0e11" : "#f6f3ec";
}

function applyTheme(branding: PortalBranding | null) {
  const accent =
    branding?.primaryColor && /^#[0-9a-f]{6}$/i.test(branding.primaryColor)
      ? branding.primaryColor
      : DEFAULT_ACCENT;
  const root = document.documentElement;
  root.style.setProperty("--brand", accent);
  root.style.setProperty("--brand-ink", contrastInk(accent));
}

interface BrandingContextValue {
  branding: PortalBranding | null;
  /** Re-résout le branding (à appeler après connexion / activation). */
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: null,
  refresh: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<PortalBranding | null>(null);

  const adopt = useCallback((fresh: PortalBranding) => {
    setBranding(fresh);
    writeCache(fresh);
    applyTheme(fresh);
  }, []);

  const refresh = useCallback(async () => {
    try {
      if (tokenStore.getAccessToken()) {
        adopt(await portalApi.getBranding());
        return;
      }
      const slug =
        new URLSearchParams(window.location.search).get("garage") ?? readCache()?.slug;
      if (slug) adopt(await portalApi.getBrandingBySlug(slug));
    } catch {
      // API injoignable ou slug inconnu : on garde le cache / le thème par défaut.
    }
  }, [adopt]);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setBranding(cached);
      applyTheme(cached);
    }
    void refresh();
  }, [refresh]);

  return (
    <BrandingContext.Provider value={{ branding, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}
