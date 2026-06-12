"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useCapabilities } from "@/lib/hooks/useCapabilities";
import { capabilitiesApi } from "@/lib/api/capabilities";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { useSession } from "@/lib/auth/session-context";

export function PluginsSettings() {
  const queryClient = useQueryClient();
  const { me } = useSession();
  const role = me?.organizations.find(
    (o) => o.organizationId === me.activeOrganizationId,
  )?.role;
  const canManage = role === "Owner" || role === "Admin";

  const { data, isLoading } = useCapabilities();

  const mutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      capabilitiesApi.set(key, enabled),
    onSuccess: async (_data, vars) => {
      toast.success(vars.enabled ? "Module activé" : "Module désactivé");
      // Rafraîchit le hook (sidebar, sections gatées) pour refléter l'état.
      await queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.all() });
    },
    onError: (e) => toast.error(extractApiErrorMessage(e, "Modification impossible.")),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!canManage && (
        <p className="text-xs text-muted-foreground">
          Seuls les rôles Owner/Admin peuvent activer ou désactiver les modules.
        </p>
      )}
      <div className="divide-y divide-border rounded-lg border border-border">
        {(data ?? []).map((c) => {
          const pending = mutation.isPending && mutation.variables?.key === c.key;
          return (
            <div key={c.key} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <Switch
                checked={c.enabled}
                disabled={!canManage || pending}
                onCheckedChange={(checked) =>
                  mutation.mutate({ key: c.key, enabled: checked })
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
