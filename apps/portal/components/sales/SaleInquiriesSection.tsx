"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Mail, Pencil, Phone, Plus, Trash2, Users } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowActions } from "@/components/ui/RowActions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import {
  inquiryChannelLabels,
  inquiryStatusLabels,
  salesApi,
  type InquiryStatusApi,
  type SaleDossier,
  type SaleInquiry,
} from "@/lib/api/sales";
import { useSaleDossierMutation } from "@/lib/hooks/useSaleDossier";
import { InquiryFormDialog } from "@/components/sales/InquiryFormDialog";
import { money, shortDate } from "@/components/sales/saleFormat";

const STATUS_TONE: Record<InquiryStatusApi, StatusTone> = {
  New: "info",
  Contacted: "neutral",
  TestDriveScheduled: "warning",
  OfferMade: "warning",
  Negotiating: "warning",
  Won: "success",
  Lost: "danger",
};

/** Prospection : les acheteurs potentiels sur ce véhicule et où ils en sont. */
export function SaleInquiriesSection({ dossier }: { dossier: SaleDossier }) {
  const [dialog, setDialog] = useState<
    { kind: "create" } | { kind: "edit"; inquiry: SaleInquiry } | null
  >(null);
  const [toDelete, setToDelete] = useState<SaleInquiry | null>(null);

  const deleteMutation = useSaleDossierMutation(
    dossier.vehicleId,
    (id: string) => salesApi.removeInquiry(id),
    {
      successMessage: "Contact supprimé",
      errorMessage: "Suppression impossible.",
      onDone: () => setToDelete(null),
    },
  );

  const inquiries = dossier.inquiries;
  const floor = dossier.listing?.floorPrice ?? null;

  return (
    <>
      <SectionCard
        title="Contacts acheteurs"
        description={
          inquiries.length === 0
            ? "Aucun contact"
            : `${dossier.metrics.openInquiryCount} en cours sur ${inquiries.length}`
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => setDialog({ kind: "create" })}>
            <Plus />
            Nouveau contact
          </Button>
        }
      >
        {inquiries.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun contact enregistré"
            description="Notez chaque appel ou message reçu : offre proposée, essai prévu, relance à faire."
            action={
              <Button size="sm" onClick={() => setDialog({ kind: "create" })}>
                Enregistrer un contact
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {inquiries.map((inquiry) => {
              const belowFloor =
                floor != null &&
                inquiry.offerAmount != null &&
                inquiry.offerAmount < floor;

              return (
                <li
                  key={inquiry.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Le contact vit sur une fiche client : on y renvoie plutôt
                          que d'afficher un nom mort. */}
                      <Link
                        href={`/clients/${inquiry.customerId}`}
                        className="font-medium hover:underline"
                      >
                        {inquiry.customerFullName}
                      </Link>
                      <StatusBadge tone={STATUS_TONE[inquiry.status]}>
                        {inquiryStatusLabels[inquiry.status]}
                      </StatusBadge>
                      <span className="text-xs text-muted-foreground">
                        {inquiryChannelLabels[inquiry.channel]} ·{" "}
                        {shortDate(inquiry.receivedAt)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {inquiry.phone && (
                        <a
                          href={`tel:${inquiry.phone}`}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <Phone className="size-3.5" />
                          {inquiry.phone}
                        </a>
                      )}
                      {inquiry.email && (
                        <a
                          href={`mailto:${inquiry.email}`}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <Mail className="size-3.5" />
                          {inquiry.email}
                        </a>
                      )}
                      {inquiry.testDriveAt && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="size-3.5" />
                          Essai le {shortDate(inquiry.testDriveAt)}
                        </span>
                      )}
                      {inquiry.nextFollowUpAt && (
                        <span className="inline-flex items-center gap-1">
                          Relance le {shortDate(inquiry.nextFollowUpAt)}
                        </span>
                      )}
                    </div>

                    {inquiry.notes && (
                      <p className="text-xs text-muted-foreground">{inquiry.notes}</p>
                    )}
                    {inquiry.lostReason && (
                      <p className="text-xs text-destructive">
                        Perdu : {inquiry.lostReason}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {inquiry.offerAmount != null && (
                      <span className="text-right">
                        <span className="block text-sm font-semibold tabular-nums">
                          {money(inquiry.offerAmount)}
                        </span>
                        {belowFloor && (
                          <span className="block text-[11px] text-amber-600 dark:text-amber-400">
                            sous le plancher
                          </span>
                        )}
                      </span>
                    )}
                    <RowActions
                      actions={[
                        {
                          label: "Modifier",
                          icon: <Pencil className="size-4" />,
                          onSelect: () => setDialog({ kind: "edit", inquiry }),
                        },
                        {
                          label: "Supprimer",
                          icon: <Trash2 className="size-4" />,
                          onSelect: () => setToDelete(inquiry),
                          variant: "destructive",
                          separatorBefore: true,
                        },
                      ]}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {dialog && (
        <InquiryFormDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          vehicleId={dossier.vehicleId}
          inquiry={dialog.kind === "edit" ? dialog.inquiry : null}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce contact ?"
        description={
          toDelete
            ? `Le contact de « ${toDelete.customerFullName} » sur ce véhicule sera supprimé. Sa fiche client est conservée.`
            : undefined
        }
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={async () => {
          if (toDelete) await deleteMutation.mutateAsync(toDelete.id);
        }}
      />
    </>
  );
}
