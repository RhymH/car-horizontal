"use client";

import { useState } from "react";
import { ExternalLink, Globe, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowActions } from "@/components/ui/RowActions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  channelPostStatusLabels,
  salesApi,
  type ChannelPostStatusApi,
  type SaleChannelPost,
  type SaleDossier,
} from "@/lib/api/sales";
import { useSaleDossierMutation } from "@/lib/hooks/useSaleDossier";
import { ChannelPostFormDialog } from "@/components/sales/ChannelPostFormDialog";
import { money, shortDate } from "@/components/sales/saleFormat";

const STATUS_TONE: Record<ChannelPostStatusApi, StatusTone> = {
  Draft: "neutral",
  Online: "success",
  Paused: "warning",
  Expired: "warning",
  Removed: "neutral",
};

/**
 * Où le véhicule est publié. Le repère « prix désynchronisé » est le point utile :
 * après une baisse, une annonce oubliée sur une plateforme continue d'afficher
 * l'ancien prix.
 */
export function SaleChannelPostsSection({ dossier }: { dossier: SaleDossier }) {
  const [dialog, setDialog] = useState<
    { kind: "create" } | { kind: "edit"; post: SaleChannelPost } | null
  >(null);
  const [toDelete, setToDelete] = useState<SaleChannelPost | null>(null);

  const deleteMutation = useSaleDossierMutation(
    dossier.vehicleId,
    (postId: string) => salesApi.removeChannelPost(postId),
    {
      successMessage: "Annonce retirée du suivi",
      errorMessage: "Suppression impossible.",
      onDone: () => setToDelete(null),
    },
  );

  const posts = dossier.channelPosts;
  const outOfSync = posts.filter((p) => p.priceOutOfSync).length;

  return (
    <>
      <SectionCard
        title="Annonces publiées"
        description={
          posts.length === 0
            ? "Aucune annonce suivie"
            : `${posts.length} annonce${posts.length > 1 ? "s" : ""}${
                outOfSync > 0 ? ` — ${outOfSync} au mauvais prix` : ""
              }`
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => setDialog({ kind: "create" })}>
            <Plus />
            Ajouter un lien
          </Button>
        }
      >
        {posts.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="Aucune annonce référencée"
            description="Enregistrez le lien de chaque site où le véhicule est publié : vous les retrouverez tous au moment d'une baisse de prix ou de la vente."
            action={
              <Button size="sm" onClick={() => setDialog({ kind: "create" })}>
                Ajouter un lien
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Site</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden sm:table-cell">Publiée le</TableHead>
                  <TableHead className="text-right">Prix affiché</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      {post.url ? (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          {post.channel}
                          <ExternalLink className="size-3.5 text-muted-foreground" />
                        </a>
                      ) : (
                        post.channel
                      )}
                      {post.externalReference && (
                        <span className="block text-xs text-muted-foreground">
                          réf. {post.externalReference}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={STATUS_TONE[post.status]}>
                        {channelPostStatusLabels[post.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell whitespace-nowrap text-sm text-muted-foreground">
                      {shortDate(post.publishedAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        {post.priceOutOfSync && (
                          <TriangleAlert
                            className="size-3.5 text-amber-500"
                            aria-label="Prix différent de celui du dossier"
                          />
                        )}
                        {money(post.displayedPrice)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <RowActions
                        actions={[
                          {
                            label: "Modifier",
                            icon: <Pencil className="size-4" />,
                            onSelect: () => setDialog({ kind: "edit", post }),
                          },
                          {
                            label: "Supprimer",
                            icon: <Trash2 className="size-4" />,
                            onSelect: () => setToDelete(post),
                            variant: "destructive",
                            separatorBefore: true,
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {dialog && (
        <ChannelPostFormDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          vehicleId={dossier.vehicleId}
          askingPrice={dossier.listing?.askingPrice ?? null}
          post={dialog.kind === "edit" ? dialog.post : null}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Retirer cette annonce du suivi ?"
        description={
          toDelete
            ? `Le lien vers ${toDelete.channel} ne sera plus suivi ici. L'annonce en ligne n'est pas supprimée.`
            : undefined
        }
        confirmLabel="Retirer"
        variant="destructive"
        onConfirm={async () => {
          if (toDelete) await deleteMutation.mutateAsync(toDelete.id);
        }}
      />
    </>
  );
}
