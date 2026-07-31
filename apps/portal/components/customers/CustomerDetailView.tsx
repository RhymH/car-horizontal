"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Loader2, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { customersApi } from "@/lib/api/customers";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { formatPhone } from "@/lib/format";
import { CustomerDetailHeader } from "@/components/customers/CustomerDetailHeader";
import { CustomerVehiclesSection } from "@/components/customers/CustomerVehiclesSection";
import { CustomerInteractionsSection } from "@/components/customers/CustomerInteractionsSection";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { AddInteractionDialog } from "@/components/customers/AddInteractionDialog";
import { VehicleFormDialog } from "@/components/vehicles/VehicleFormDialog";
import { CustomerTimelineTab } from "@/components/customers/CustomerTimelineTab";
import { CustomerLeadTab } from "@/components/leads/CustomerLeadTab";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);

  const detail = useQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: ({ signal }) => customersApi.get(customerId, signal),
  });

  const deleteMutation = useMutation({
    mutationFn: () => customersApi.remove(customerId),
    onSuccess: async () => {
      toast.success("Client supprimé");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customers.all(),
      });
      router.push("/clients");
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Suppression impossible.")),
  });

  if (detail.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Client introuvable ou indisponible.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push("/clients")}>
          Retour aux clients
        </Button>
      </div>
    );
  }

  const customer = detail.data;

  const copy = async (value: string | null, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <CustomerDetailHeader
        customer={customer}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onAddInteraction={() => setInteractionOpen(true)}
        onAddVehicle={() => setAddVehicleOpen(true)}
      />

      <Tabs
        defaultValue={customer.vehicles.length === 0 ? "prospect" : "overview"}
      >
        <TabsList>
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="prospect">Gestion prospect</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Informations" className="lg:col-span-1">
              <dl className="space-y-3 text-sm">
                <InfoRow
                  label="Email"
                  value={customer.email}
                  icon={<Mail className="size-3.5" />}
                  onCopy={() => copy(customer.email, "Email")}
                />
                <InfoRow
                  label="Téléphone"
                  value={customer.phone ? formatPhone(customer.phone) : null}
                  icon={<Phone className="size-3.5" />}
                  onCopy={() => copy(customer.phone, "Téléphone")}
                />
                <InfoRow
                  label="Adresse"
                  value={[customer.address, customer.postalCode, customer.city]
                    .filter(Boolean)
                    .join(", ") || null}
                  icon={<MapPin className="size-3.5" />}
                />
                <InfoRow
                  label="Commercial"
                  value={customer.salespersonName}
                  icon={<UserRound className="size-3.5" />}
                  emptyLabel="Non assigné"
                />
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Acquis le
                  </dt>
                  <dd>{dateFormatter.format(new Date(customer.acquiredAt))}</dd>
                </div>
                {customer.tags.length > 0 && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      Tags
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {customer.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-muted px-1.5 py-0.5 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {customer.notes && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      Notes
                    </dt>
                    <dd className="whitespace-pre-line text-muted-foreground">
                      {customer.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </SectionCard>

            <div className="lg:col-span-2 space-y-4">
              <CustomerVehiclesSection
                vehicles={customer.vehicles}
                onAddVehicle={() => setAddVehicleOpen(true)}
              />
              <CustomerInteractionsSection
                interactions={customer.recentInteractions}
                onAdd={() => setInteractionOpen(true)}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="prospect">
          <CustomerLeadTab
            customerId={customer.id}
            onAddInteraction={() => setInteractionOpen(true)}
          />
        </TabsContent>
        <TabsContent value="timeline">
          <SectionCard
            title="Timeline"
            description="Événements à venir et passés liés à ce client."
          >
            <CustomerTimelineTab customerId={customer.id} />
          </SectionCard>
        </TabsContent>
      </Tabs>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode={{ kind: "edit", customer }}
      />

      <AddInteractionDialog
        open={interactionOpen}
        onOpenChange={setInteractionOpen}
        customerId={customer.id}
      />

      <VehicleFormDialog
        open={addVehicleOpen}
        onOpenChange={setAddVehicleOpen}
        mode={{
          kind: "create",
          defaultCustomerId: customer.id,
          defaultCustomerLabel: customer.fullName,
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer ce client ?"
        description={`« ${customer.fullName} » sera supprimé. Ses véhicules ne seront pas supprimés.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
  onCopy,
  emptyLabel = "Non renseigné",
}: {
  label: string;
  value: string | null;
  icon?: React.ReactNode;
  onCopy?: () => void;
  emptyLabel?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className={value ? "" : "text-muted-foreground"}>
          {value ?? emptyLabel}
        </span>
        {value && onCopy && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCopy}
            aria-label={`Copier ${label.toLowerCase()}`}
            className="ml-auto"
          >
            <Copy />
          </Button>
        )}
      </dd>
    </div>
  );
}
