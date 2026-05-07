"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Mail,
  MessageSquareText,
  PartyPopper,
  Users,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/SectionCard";
import { useSession } from "@/lib/auth/session-context";
import { customersApi } from "@/lib/api/customers";
import { vehiclesApi } from "@/lib/api/vehicles";
import { queryKeys } from "@/lib/query/keys";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { VehicleFormDialog } from "@/components/vehicles/VehicleFormDialog";
import { cn } from "@/lib/utils";

type StepKey = "garage" | "customers" | "vehicles" | "messaging" | "done";

const steps: { key: StepKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "garage", label: "Garage", icon: Building2 },
  { key: "customers", label: "Clients", icon: Users },
  { key: "vehicles", label: "Véhicules", icon: Car },
  { key: "messaging", label: "Messaging", icon: MessageSquareText },
  { key: "done", label: "C'est parti", icon: PartyPopper },
];

export function OnboardingWizard() {
  const router = useRouter();
  const { me } = useSession();
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex].key;

  const customersList = useQuery({
    queryKey: queryKeys.customers.list({ page: 1, pageSize: 5 }),
    queryFn: ({ signal }) =>
      customersApi.list({ page: 1, pageSize: 5 }, signal),
  });
  const vehiclesList = useQuery({
    queryKey: queryKeys.vehicles.list({ page: 1, pageSize: 50 }),
    queryFn: ({ signal }) =>
      vehiclesApi.list({ page: 1, pageSize: 50 }, signal),
  });

  const customerCount = customersList.data?.total ?? 0;
  const vehicleCount = vehiclesList.data?.total ?? 0;

  const goNext = () =>
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const finish = () => router.push("/dashboard");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Bienvenue sur CarHorizontal</h1>
        <p className="text-sm text-muted-foreground">
          Configurons votre espace en quelques minutes — vous pourrez tout
          modifier ensuite.
        </p>
      </header>

      <Stepper currentIndex={stepIndex} />

      {step === "garage" && (
        <GarageStep
          orgName={
            me?.organizations.find(
              (o) => o.organizationId === me?.activeOrganizationId,
            )?.name ?? ""
          }
          onNext={goNext}
          onSkip={finish}
        />
      )}

      {step === "customers" && (
        <CustomersStep
          customerCount={customerCount}
          onBack={goBack}
          onNext={goNext}
          onSkip={finish}
        />
      )}

      {step === "vehicles" && (
        <VehiclesStep
          vehicleCount={vehicleCount}
          customerCount={customerCount}
          onBack={goBack}
          onNext={goNext}
          onSkip={finish}
        />
      )}

      {step === "messaging" && (
        <MessagingStep onBack={goBack} onNext={goNext} onSkip={finish} />
      )}

      {step === "done" && (
        <DoneStep
          customerCount={customerCount}
          vehicleCount={vehicleCount}
          onFinish={finish}
        />
      )}
    </div>
  );
}

function Stepper({ currentIndex }: { currentIndex: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li
            key={s.key}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
              active && "border-primary bg-primary/10 text-primary",
              done && "border-emerald-200 bg-emerald-50 text-emerald-700",
              !active && !done && "border-border text-muted-foreground",
            )}
          >
            {done ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <Icon className="size-3.5" />
            )}
            <span className="font-medium">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function GarageStep({
  orgName,
  onNext,
  onSkip,
}: {
  orgName: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <SectionCard title="Votre garage">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
          <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium">{orgName}</span>
            <span className="text-xs text-muted-foreground">
              Vous pourrez compléter le téléphone, l'adresse et le logo dans
              Paramètres › Organisation.
            </span>
          </div>
        </div>
      </div>
      <FooterActions
        onSkip={onSkip}
        primary={
          <Button onClick={onNext} className="gap-1">
            Continuer <ArrowRight className="size-4" />
          </Button>
        }
      />
    </SectionCard>
  );
}

function CustomersStep({
  customerCount,
  onBack,
  onNext,
  onSkip,
}: {
  customerCount: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <SectionCard
      title="Vos clients"
      description="Ajoutez votre premier client (vous pourrez importer un CSV plus tard)."
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          {customerCount === 0
            ? "Aucun client enregistré pour l'instant."
            : `${customerCount} client${customerCount > 1 ? "s" : ""} déjà enregistré${customerCount > 1 ? "s" : ""}.`}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCreateOpen(true)}
            className="gap-1"
          >
            <Users className="size-4" /> Ajouter un client
          </Button>
        </div>
      </div>
      <FooterActions
        onSkip={onSkip}
        secondary={
          <Button type="button" variant="ghost" onClick={onBack} className="gap-1">
            <ArrowLeft className="size-4" /> Retour
          </Button>
        }
        primary={
          <Button onClick={onNext} className="gap-1">
            Continuer <ArrowRight className="size-4" />
          </Button>
        }
      />
      <CustomerFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode={{ kind: "create" }}
      />
    </SectionCard>
  );
}

function VehiclesStep({
  vehicleCount,
  customerCount,
  onBack,
  onNext,
  onSkip,
}: {
  vehicleCount: number;
  customerCount: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [open, setOpen] = useState(false);

  const noCustomers = customerCount === 0;

  return (
    <SectionCard
      title="Véhicules"
      description="Sélectionnez le modèle dans le catalogue — le programme constructeur sera attaché automatiquement (vidange, courroie, contrôles, etc.)."
    >
      <div className="space-y-3">
        <p className="text-sm">
          {vehicleCount === 0
            ? "Aucun véhicule enregistré."
            : `${vehicleCount} véhicule${vehicleCount > 1 ? "s" : ""} suivi${vehicleCount > 1 ? "s" : ""}.`}
        </p>
        {noCustomers ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Ajoutez d'abord un client à l'étape précédente pour pouvoir lui
            associer un véhicule.
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(true)}
            className="gap-1"
          >
            <Car className="size-4" /> Ajouter un véhicule
          </Button>
        )}
      </div>
      <FooterActions
        onSkip={onSkip}
        secondary={
          <Button type="button" variant="ghost" onClick={onBack} className="gap-1">
            <ArrowLeft className="size-4" /> Retour
          </Button>
        }
        primary={
          <Button onClick={onNext} className="gap-1">
            Continuer <ArrowRight className="size-4" />
          </Button>
        }
      />
      <VehicleFormDialog
        open={open}
        onOpenChange={setOpen}
        mode={{ kind: "create" }}
      />
    </SectionCard>
  );
}

function MessagingStep({
  onBack,
  onNext,
  onSkip,
}: {
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <SectionCard
      title="Communication"
      description="Comment souhaitez-vous gérer les rappels envoyés à vos clients ?"
    >
      <div className="space-y-2">
        <Choice
          icon={Mail}
          title="Envoyer automatiquement"
          description="CarHorizontal envoie SMS/Email aux dates prévues. Vous gardez un journal de tous les envois."
          recommended
        />
        <Choice
          icon={MessageSquareText}
          title="Me prévenir, j'enverrai moi-même"
          description="Vous recevez une notification interne — vous décidez quand envoyer."
        />
        <Choice
          icon={CheckCircle2}
          title="Désactiver pour l'instant"
          description="Aucun envoi automatique. Vous pourrez activer plus tard depuis les Paramètres."
        />
        <p className="text-xs text-muted-foreground">
          Les paramètres définitifs (provider SMS, sender ID, templates) sont à
          configurer dans Paramètres › Messaging — disponible quand le
          messaging sera activé.
        </p>
      </div>
      <FooterActions
        onSkip={onSkip}
        secondary={
          <Button type="button" variant="ghost" onClick={onBack} className="gap-1">
            <ArrowLeft className="size-4" /> Retour
          </Button>
        }
        primary={
          <Button onClick={onNext} className="gap-1">
            Continuer <ArrowRight className="size-4" />
          </Button>
        }
      />
    </SectionCard>
  );
}

function Choice({
  icon: Icon,
  title,
  description,
  recommended,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  recommended?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3 text-sm hover:bg-accent/30">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="flex items-center gap-2 font-medium">
          {title}
          {recommended && (
            <span className="rounded-full bg-emerald-100 px-1.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
              Recommandé
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </div>
  );
}

function DoneStep({
  customerCount,
  vehicleCount,
  onFinish,
}: {
  customerCount: number;
  vehicleCount: number;
  onFinish: () => void;
}) {
  return (
    <SectionCard title="Tout est prêt">
      <div className="space-y-3">
        <p className="text-sm">
          Votre espace est opérationnel. Voici ce que CarHorizontal a déjà
          détecté pour vous :
        </p>
        <ul className="space-y-1 text-sm">
          <li className="flex items-center gap-2">
            <Users className="size-3.5 text-muted-foreground" />
            <strong>{customerCount}</strong>{" "}
            client{customerCount > 1 ? "s" : ""} suivi{customerCount > 1 ? "s" : ""}
          </li>
          <li className="flex items-center gap-2">
            <Car className="size-3.5 text-muted-foreground" />
            <strong>{vehicleCount}</strong>{" "}
            véhicule{vehicleCount > 1 ? "s" : ""} avec programme constructeur
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-muted-foreground" />
            Timeline auto-projetée pour les 12 prochains mois
          </li>
        </ul>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          Conseil : ouvrez la fiche d'un véhicule pour voir son programme
          d'entretien constructeur — c'est là que toute la valeur du logiciel
          se trouve.
        </div>
      </div>
      <FooterActions
        primary={
          <Button onClick={onFinish} className="gap-1">
            Aller au tableau de bord <ArrowRight className="size-4" />
          </Button>
        }
      />
    </SectionCard>
  );
}

function FooterActions({
  primary,
  secondary,
  onSkip,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  onSkip?: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
      <div>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Passer la configuration
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {secondary}
        {primary}
      </div>
    </div>
  );
}
