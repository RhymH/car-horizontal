"use client";

import { useState } from "react";
import { FileDown, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tabs, TabsBadge, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCapability } from "@/lib/hooks/useCapabilities";
import { CAPABILITY_SALES } from "@/lib/api/capabilities";
import { salesApi, type SaleStatusApi } from "@/lib/api/sales";
import { useSaleDossier, useSaleDossierMutation } from "@/lib/hooks/useSaleDossier";
import { SaleSummaryCard } from "@/components/sales/SaleSummaryCard";
import { SalePriceHistorySection } from "@/components/sales/SalePriceHistorySection";
import { SalePhotoGallery } from "@/components/sales/SalePhotoGallery";
import { SaleChannelPostsSection } from "@/components/sales/SaleChannelPostsSection";
import { SaleInquiriesSection } from "@/components/sales/SaleInquiriesSection";
import { RegistrationSection } from "@/components/sales/RegistrationSection";
import { SalePriceDialog } from "@/components/sales/SalePriceDialog";
import { SaleListingFormDialog } from "@/components/sales/SaleListingFormDialog";
import { RegistrationFormDialog } from "@/components/sales/RegistrationFormDialog";
import { SaleMosaicDialog } from "@/components/sales/SaleMosaicDialog";
import { SaleExportDialog } from "@/components/sales/SaleExportDialog";

/**
 * Onglet « Vente » de la fiche véhicule. Tout le dossier commercial tient ici :
 * prix et son historique, photos et mosaïques, annonces publiées, contacts
 * acheteurs, et les données de carte grise nécessaires à l'immatriculation.
 */
export function SaleSection({
  vehicleId,
  onEditVehicle,
}: {
  vehicleId: string;
  /** Ouvre la modale d'édition du véhicule (VIN, plaque… vivent sur la fiche). */
  onEditVehicle: () => void;
}) {
  const { enabled } = useCapability(CAPABILITY_SALES);
  const dossierQuery = useSaleDossier(vehicleId, enabled);

  const [tab, setTab] = useState("annonce");
  const [priceOpen, setPriceOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [mosaicOpen, setMosaicOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dossier = dossierQuery.data;

  const statusMutation = useSaleDossierMutation(
    vehicleId,
    (status: SaleStatusApi) => salesApi.upsertListing(vehicleId, { status }),
    { successMessage: "Statut mis à jour", errorMessage: "Changement de statut impossible." },
  );

  const deleteMutation = useSaleDossierMutation<void>(
    vehicleId,
    async () => {
      await salesApi.deleteListing(vehicleId);
      return salesApi.getDossier(vehicleId);
    },
    {
      successMessage: "Dossier de vente supprimé",
      errorMessage: "Suppression impossible.",
      onDone: () => setDeleteOpen(false),
    },
  );

  // Module désactivé pour l'organisation → l'onglet n'a pas de contenu.
  if (!enabled) return null;

  if (dossierQuery.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (dossierQuery.isError || !dossier) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Dossier de vente indisponible.
      </p>
    );
  }

  const missingFields = dossier.registrationReadiness.missing.map((m) => m.field);

  return (
    <div className="flex flex-col gap-4">
      <SaleSummaryCard
        dossier={dossier}
        onChangeStatus={(status) => statusMutation.mutate(status)}
        onEditPrice={() => setPriceOpen(true)}
        onEditDetails={() => setDetailsOpen(true)}
        statusPending={statusMutation.isPending}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList size="sm">
          <TabsTrigger value="annonce">
            Photos
            <TabsBadge>{dossier.photos.length}</TabsBadge>
          </TabsTrigger>
          <TabsTrigger value="prix">
            Prix
            <TabsBadge>{dossier.priceHistory.length}</TabsBadge>
          </TabsTrigger>
          <TabsTrigger value="diffusion">
            Diffusion
            <TabsBadge>{dossier.channelPosts.length}</TabsBadge>
          </TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts
            <TabsBadge>{dossier.inquiries.length}</TabsBadge>
          </TabsTrigger>
          <TabsTrigger value="administratif">
            Administratif
            {!dossier.registrationReadiness.isReady && (
              <TabsBadge>{dossier.registrationReadiness.requiredMissingCount}</TabsBadge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="annonce">
          <SalePhotoGallery dossier={dossier} onOpenMosaic={() => setMosaicOpen(true)} />
        </TabsContent>

        <TabsContent value="prix">
          <SalePriceHistorySection
            history={dossier.priceHistory}
            onChangePrice={() => setPriceOpen(true)}
          />
        </TabsContent>

        <TabsContent value="diffusion">
          <SaleChannelPostsSection dossier={dossier} />
        </TabsContent>

        <TabsContent value="contacts">
          <SaleInquiriesSection dossier={dossier} />
        </TabsContent>

        <TabsContent value="administratif">
          <RegistrationSection
            registration={dossier.registration}
            readiness={dossier.registrationReadiness}
            onEdit={() => setRegistrationOpen(true)}
            onEditVehicle={onEditVehicle}
          />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
          <FileDown />
          Exporter le dossier
        </Button>
        {dossier.listing && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Supprimer le dossier de vente
          </Button>
        )}
      </div>

      <SalePriceDialog open={priceOpen} onOpenChange={setPriceOpen} dossier={dossier} />
      {/* Montées à la demande : chaque ouverture repart des valeurs du dossier. */}
      {detailsOpen && (
        <SaleListingFormDialog
          open
          onOpenChange={setDetailsOpen}
          dossier={dossier}
        />
      )}
      {registrationOpen && (
        <RegistrationFormDialog
          open
          onOpenChange={setRegistrationOpen}
          vehicleId={vehicleId}
          registration={dossier.registration}
          highlightFields={missingFields}
        />
      )}
      {mosaicOpen && (
        <SaleMosaicDialog open onOpenChange={setMosaicOpen} dossier={dossier} />
      )}
      <SaleExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        vehicleId={vehicleId}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer le dossier de vente ?"
        description="Les photos, annonces suivies, contacts et l'historique de prix seront supprimés. Le véhicule et son historique d'entretien sont conservés."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />
    </div>
  );
}
