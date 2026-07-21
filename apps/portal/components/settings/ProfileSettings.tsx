"use client";

import { Building2, Check, LogOut, Mail, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard } from "@/components/ui/SectionCard";
import { useSession } from "@/lib/auth/session-context";

const roleLabels: Record<string, string> = {
  Owner: "Propriétaire",
  Admin: "Administrateur",
  Mechanic: "Mécanicien",
  Viewer: "Lecture seule",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProfileSettings() {
  const { me, isLoading, logout } = useSession();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!me) {
    return (
      <SectionCard>
        <p className="text-sm text-muted-foreground">
          Session expirée. Reconnectez-vous pour accéder à votre profil.
        </p>
      </SectionCard>
    );
  }

  const activeOrg =
    me.organizations.find((o) => o.organizationId === me.activeOrganizationId) ??
    null;

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Identité"
        description="Ces informations sont issues de votre compte utilisateur."
      >
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-base">
              {initials(me.fullName || me.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium">
              <User className="size-4 text-muted-foreground" />
              {me.fullName || "—"}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4" />
              <span className="truncate">{me.email}</span>
            </p>
            {activeOrg && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="size-4" />
                {activeOrg.name}
                <Badge variant="secondary">
                  {roleLabels[activeOrg.role] ?? activeOrg.role}
                </Badge>
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Vos garages"
        description="Organisations auxquelles votre compte est rattaché. Changez de garage actif depuis le sélecteur de la barre supérieure."
      >
        <ul className="divide-y divide-border rounded-lg border border-border">
          {me.organizations.map((org) => {
            const isActive = org.organizationId === me.activeOrganizationId;
            return (
              <li
                key={org.organizationId}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabels[org.role] ?? org.role}
                  </p>
                </div>
                {isActive && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Check className="size-4" />
                    Garage actif
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard
        title="Session"
        description="Déconnexion de cet appareil. Les jetons d'accès sont révoqués."
      >
        <Button variant="outline" onClick={() => void logout()}>
          <LogOut />
          Se déconnecter
        </Button>
      </SectionCard>
    </div>
  );
}
