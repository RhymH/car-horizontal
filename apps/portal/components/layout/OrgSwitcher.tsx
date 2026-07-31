"use client";

import { useState } from "react";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/session-context";
import { apiClient } from "@/lib/api/client";
import { tokenStore } from "@/lib/auth/tokens";
import { cn } from "@/lib/utils";
import type { SwitchOrgResponse } from "@/lib/api/types";

export function OrgSwitcher() {
  const { me, refresh } = useSession();
  const [pending, setPending] = useState<string | null>(null);

  if (!me || me.organizations.length === 0) return null;

  const active =
    me.organizations.find((o) => o.organizationId === me.activeOrganizationId) ??
    me.organizations[0];

  const switchTo = async (organizationId: string) => {
    if (organizationId === active.organizationId) return;
    setPending(organizationId);
    try {
      const res = await apiClient.post<SwitchOrgResponse>(
        "/api/auth/switch-org",
        { organizationId },
      );
      tokenStore.setFromTokens(res.data.tokens, res.data.activeOrganizationId);
      await refresh();
      toast.success("Garage actif modifié");
    } catch {
      toast.error("Impossible de changer de garage");
    } finally {
      setPending(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" className="gap-2 px-3">
            <Building2 className="size-4 text-muted-foreground" />
            <span className="max-w-[160px] truncate">{active.name}</span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-72 p-0">
        <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Vos garages
        </div>
        <ul className="max-h-72 overflow-y-auto pb-1">
          {me.organizations.map((org) => {
            const isActive = org.organizationId === active.organizationId;
            const isPending = pending === org.organizationId;
            return (
              <li key={org.organizationId}>
                <button
                  type="button"
                  onClick={() => switchTo(org.organizationId)}
                  disabled={isPending}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    isActive && "bg-accent/60",
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{org.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {org.role}
                    </span>
                  </div>
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : isActive ? (
                    <Check className="size-4 text-primary" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
