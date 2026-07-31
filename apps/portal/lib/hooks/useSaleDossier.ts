"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { salesApi, type SaleDossier } from "@/lib/api/sales";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";

/** Dossier de vente d'un véhicule. `enabled` suit l'activation du module. */
export function useSaleDossier(vehicleId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.sales.dossier(vehicleId),
    queryFn: ({ signal }) => salesApi.getDossier(vehicleId, signal),
    enabled,
  });
}

/**
 * Toutes les écritures du module renvoient le dossier complet : on écrit
 * directement le cache au lieu d'invalider, ce qui évite un aller-retour et le
 * clignotement de la galerie. Les vues qui dépendent du statut de vente
 * (liste véhicules, stock) sont invalidées en arrière-plan.
 */
export function useSaleDossierMutation<TVariables>(
  vehicleId: string,
  mutationFn: (variables: TVariables) => Promise<SaleDossier>,
  options: { successMessage?: string; errorMessage?: string; onDone?: () => void } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (dossier) => {
      queryClient.setQueryData(queryKeys.sales.dossier(vehicleId), dossier);
      void queryClient.invalidateQueries({ queryKey: queryKeys.sales.listings() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all() });
      // Un contact acheteur peut créer une fiche client : les vues côté client
      // (liste, prospects, intérêts d'achat) doivent le refléter aussitôt.
      void queryClient.invalidateQueries({ queryKey: ["sales", "customer-inquiries"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      if (options.successMessage) toast.success(options.successMessage);
      options.onDone?.();
    },
    onError: (e) =>
      toast.error(
        extractApiErrorMessage(e, options.errorMessage ?? "Enregistrement impossible."),
      ),
  });
}

/** Déclenche un téléchargement navigateur à partir d'un blob. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
