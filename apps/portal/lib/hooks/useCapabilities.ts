"use client";

import { useQuery } from "@tanstack/react-query";
import { capabilitiesApi, type Capability } from "@/lib/api/capabilities";
import { queryKeys } from "@/lib/query/keys";

/** Liste des plugins (capabilities) effectifs pour l'organisation courante. */
export function useCapabilities() {
  return useQuery({
    queryKey: queryKeys.capabilities.list(),
    queryFn: ({ signal }) => capabilitiesApi.list(signal),
    staleTime: 5 * 60_000,
  });
}

/**
 * True si le plugin <paramref name="key"/> est activé. Pendant le chargement,
 * renvoie false (l'UI du plugin reste masquée tant qu'on n'a pas confirmé).
 */
export function useCapability(key: string): { enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useCapabilities();
  const enabled = (data as Capability[] | undefined)?.some((c) => c.key === key && c.enabled) ?? false;
  return { enabled, isLoading };
}
