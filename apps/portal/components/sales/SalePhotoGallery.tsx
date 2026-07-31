"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Grid2x2,
  Images,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { salesApi, type SaleDossier, type SalePhoto } from "@/lib/api/sales";
import { useSaleDossierMutation } from "@/lib/hooks/useSaleDossier";
import { SalePhotoImage } from "@/components/sales/SalePhotoImage";
import { SalePhotoLightbox } from "@/components/sales/SalePhotoLightbox";
import { fileSize } from "@/components/sales/saleFormat";
import { cn } from "@/lib/utils";

const ACCEPTED = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Galerie des photos d'annonce : import multiple (glisser-déposer inclus), ordre
 * d'affichage, photo mise en avant, et composition de mosaïques. Les images sont
 * recompressées côté serveur — on peut déposer les photos brutes du téléphone.
 */
export function SalePhotoGallery({
  dossier,
  onOpenMosaic,
}: {
  dossier: SaleDossier;
  onOpenMosaic: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<SalePhoto | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  const photos = dossier.photos;

  const uploadMutation = useSaleDossierMutation(
    dossier.vehicleId,
    (files: File[]) => salesApi.addPhotos(dossier.vehicleId, files),
    { successMessage: "Photos ajoutées", errorMessage: "Import impossible." },
  );

  const updateMutation = useSaleDossierMutation(
    dossier.vehicleId,
    ({ id, isPrimary }: { id: string; isPrimary: boolean }) =>
      salesApi.updatePhoto(id, { isPrimary }),
    { errorMessage: "Modification impossible." },
  );

  const reorderMutation = useSaleDossierMutation(
    dossier.vehicleId,
    (photoIds: string[]) => salesApi.reorderPhotos(dossier.vehicleId, photoIds),
    { errorMessage: "Réorganisation impossible." },
  );

  const deleteMutation = useSaleDossierMutation(
    dossier.vehicleId,
    (photoId: string) => salesApi.removePhoto(photoId),
    {
      successMessage: "Photo supprimée",
      errorMessage: "Suppression impossible.",
      onDone: () => setToDelete(null),
    },
  );

  function submitFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files: File[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`« ${file.name} » n'est pas une image.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`« ${file.name} » dépasse 20 Mo.`);
        continue;
      }
      files.push(file);
    }

    if (files.length > 0) uploadMutation.mutate(files);
  }

  /** Déplace une photo d'un cran et renvoie l'ordre complet au serveur. */
  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= photos.length) return;
    const ids = photos.map((p) => p.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorderMutation.mutate(ids);
  }

  const savedBytes = photos.reduce(
    (acc, p) => acc + Math.max(0, p.originalSizeBytes - p.sizeBytes),
    0,
  );

  return (
    <>
      <SectionCard
        title="Photos de l'annonce"
        description={
          photos.length === 0
            ? "Aucune photo"
            : `${photos.length} photo${photos.length > 1 ? "s" : ""}${
                savedBytes > 0 ? ` — ${fileSize(savedBytes)} économisés à la compression` : ""
              }`
        }
        actions={
          <div className="flex gap-2">
            {photos.length > 1 && (
              <Button variant="outline" size="sm" onClick={onOpenMosaic}>
                <Grid2x2 />
                Mosaïque
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              Ajouter
            </Button>
          </div>
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => {
            submitFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            submitFiles(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-xl transition-colors",
            dragging && "bg-primary/5 outline-2 outline-dashed outline-primary/40",
          )}
        >
          {photos.length === 0 ? (
            <EmptyState
              icon={Images}
              title="Aucune photo"
              description="Glissez vos photos ici, ou importez-les depuis votre téléphone. Elles sont automatiquement compressées pour l'annonce."
              action={
                <Button size="sm" onClick={() => inputRef.current?.click()}>
                  <Upload />
                  Importer des photos
                </Button>
              }
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo, index) => (
                <li
                  key={photo.id}
                  className="group relative overflow-hidden rounded-lg border border-border bg-muted"
                >
                  <button
                    type="button"
                    onClick={() => setZoomIndex(index)}
                    aria-label={`Agrandir « ${photo.caption ?? photo.originalFileName} »`}
                    title="Agrandir"
                    className="block w-full cursor-zoom-in"
                  >
                    <SalePhotoImage
                      photoId={photo.id}
                      alt={photo.caption ?? photo.originalFileName}
                      className="aspect-4/3 w-full object-cover"
                    />
                  </button>

                  {photo.isPrimary && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                      <Star className="size-3 fill-current" />
                      Principale
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <div className="flex gap-0.5">
                      <IconAction
                        label="Déplacer à gauche"
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowLeft className="size-4" />
                      </IconAction>
                      <IconAction
                        label="Déplacer à droite"
                        disabled={index === photos.length - 1 || reorderMutation.isPending}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowRight className="size-4" />
                      </IconAction>
                    </div>
                    <div className="flex gap-0.5">
                      {!photo.isPrimary && (
                        <IconAction
                          label="Définir comme photo principale"
                          onClick={() =>
                            updateMutation.mutate({ id: photo.id, isPrimary: true })
                          }
                        >
                          <Star className="size-4" />
                        </IconAction>
                      )}
                      <IconAction
                        label="Supprimer la photo"
                        onClick={() => setToDelete(photo)}
                      >
                        <Trash2 className="size-4" />
                      </IconAction>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      <SalePhotoLightbox
        photos={photos}
        index={zoomIndex}
        onIndexChange={setZoomIndex}
        onClose={() => setZoomIndex(null)}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette photo ?"
        description={
          toDelete
            ? `« ${toDelete.originalFileName} » sera retirée de l'annonce.`
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

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-1 text-white/90 transition-colors hover:bg-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
