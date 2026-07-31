"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type SalePhoto } from "@/lib/api/sales";
import { SalePhotoImage } from "@/components/sales/SalePhotoImage";
import { fileSize } from "@/components/sales/saleFormat";

/**
 * Visionneuse plein écran des photos d'annonce. Elle charge l'image d'origine
 * (et non la vignette) : c'est le seul endroit où le garagiste peut vérifier le
 * cadrage et la netteté avant publication.
 */
export function SalePhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: SalePhoto[];
  /** Index de la photo affichée, ou null quand la visionneuse est fermée. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const open = index !== null && index >= 0 && index < photos.length;
  const photo = open ? photos[index] : null;

  const step = useCallback(
    (direction: -1 | 1) => {
      if (index === null || photos.length < 2) return;
      onIndexChange((index + direction + photos.length) % photos.length);
    },
    [index, photos.length, onIndexChange],
  );

  // Les flèches ne sont pas gérées par la modale : on les écoute tant qu'elle est ouverte.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, step]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-1/2 max-h-[92dvh] w-[min(96vw,1200px)] max-w-[96vw] -translate-y-1/2 gap-3 overflow-hidden p-3 sm:max-h-[92dvh] sm:max-w-[96vw]">
        <DialogHeader className="pr-10">
          <DialogTitle className="truncate">
            {photo?.caption ?? photo?.originalFileName ?? "Photo"}
          </DialogTitle>
          <DialogDescription>
            {photo && (
              <>
                Photo {(index ?? 0) + 1} sur {photos.length} — {photo.width} ×{" "}
                {photo.height} px · {fileSize(photo.sizeBytes)}
                {photos.length > 1 && " · naviguez avec les flèches ←/→"}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex h-[70dvh] items-center justify-center overflow-hidden rounded-lg bg-black/90">
          {photo && (
            <SalePhotoImage
              key={photo.id}
              photoId={photo.id}
              thumbnail={false}
              alt={photo.caption ?? photo.originalFileName}
              className="max-h-full max-w-full object-contain"
            />
          )}

          {photos.length > 1 && (
            <>
              <NavButton label="Photo précédente" side="left" onClick={() => step(-1)}>
                <ChevronLeft className="size-6" />
              </NavButton>
              <NavButton label="Photo suivante" side="right" onClick={() => step(1)}>
                <ChevronRight className="size-6" />
              </NavButton>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NavButton({
  label,
  side,
  onClick,
  children,
}: {
  label: string;
  side: "left" | "right";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/90 transition-colors hover:bg-black/70 hover:text-white ${
        side === "left" ? "left-2" : "right-2"
      }`}
    >
      {children}
    </button>
  );
}
