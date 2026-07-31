"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { salesApi, type SaleDossier } from "@/lib/api/sales";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { downloadBlob } from "@/lib/hooks/useSaleDossier";
import { SalePhotoImage } from "@/components/sales/SalePhotoImage";
import { cn } from "@/lib/utils";

/** Grilles proposées. La 2×2 est celle qui sert à contourner la limite de 3 photos. */
const LAYOUTS = [
  { key: "2x2", columns: 2, rows: 2, label: "2 × 2 (4 photos)" },
  { key: "1x2", columns: 1, rows: 2, label: "1 × 2 (2 photos, portrait)" },
  { key: "2x1", columns: 2, rows: 1, label: "2 × 1 (2 photos, paysage)" },
  { key: "3x2", columns: 3, rows: 2, label: "3 × 2 (6 photos)" },
  { key: "3x3", columns: 3, rows: 3, label: "3 × 3 (9 photos)" },
];

const BACKGROUNDS = [
  { value: "#FFFFFF", label: "Blanc" },
  { value: "#000000", label: "Noir" },
  { value: "#F1F5F9", label: "Gris clair" },
];

// Le composant Select affiche le libellé de la valeur courante via `items`.
const LAYOUT_ITEMS = Object.fromEntries(LAYOUTS.map((l) => [l.key, l.label]));
const BACKGROUND_ITEMS = Object.fromEntries(BACKGROUNDS.map((b) => [b.value, b.label]));

/**
 * Composition d'une planche de photos. Cas d'usage principal : publier une annonce
 * riche sur un site qui n'accepte que quelques visuels — quatre photos deviennent
 * une seule image téléchargeable.
 */
export function SaleMosaicDialog({
  open,
  onOpenChange,
  dossier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossier: SaleDossier;
}) {
  const [layoutKey, setLayoutKey] = useState("2x2");
  const [background, setBackground] = useState("#FFFFFF");

  // Le composant n'est monté que lorsque la modale s'ouvre : la présélection des
  // premières photos peut donc se faire à l'initialisation, sans effet. L'ordre de
  // la galerie ayant déjà été réglé, c'est presque toujours le bon choix.
  const [picked, setPicked] = useState<string[]>(() =>
    dossier.photos.slice(0, 4).map((p) => p.id),
  );

  const layout = useMemo(
    () => LAYOUTS.find((l) => l.key === layoutKey) ?? LAYOUTS[0],
    [layoutKey],
  );
  const capacity = layout.columns * layout.rows;

  // Passer à une grille plus petite ne doit pas laisser une sélection invalide :
  // on tronque à l'affichage plutôt que de resynchroniser un état.
  const selected = useMemo(() => picked.slice(0, capacity), [picked, capacity]);

  function toggle(photoId: string) {
    if (selected.includes(photoId)) {
      setPicked(selected.filter((id) => id !== photoId));
      return;
    }
    if (selected.length >= capacity) {
      toast.info(`Cette grille accueille ${capacity} photo${capacity > 1 ? "s" : ""}.`);
      return;
    }
    setPicked([...selected, photoId]);
  }

  const mutation = useMutation({
    mutationFn: () =>
      salesApi.buildMosaic(dossier.vehicleId, {
        photoIds: selected,
        columns: layout.columns,
        rows: layout.rows,
        cellSize: 800,
        gap: 8,
        background,
        quality: 82,
      }),
    onSuccess: (blob) => {
      const plate = (dossier.licensePlate ?? dossier.vehicleId.slice(0, 8)).replace(
        /[^A-Za-z0-9]/g,
        "",
      );
      downloadBlob(blob, `mosaique-${plate}.jpg`);
      toast.success("Mosaïque téléchargée");
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Composition de la mosaïque impossible.")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Composer une mosaïque</DialogTitle>
          <DialogDescription>
            Rassemblez plusieurs photos en une seule image — pratique pour les sites
            qui limitent le nombre de visuels par annonce.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Grille
              </Label>
              <Select
                items={LAYOUT_ITEMS}
                value={layoutKey}
                onValueChange={(v) => setLayoutKey(v ?? "2x2")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUTS.map((l) => (
                    <SelectItem key={l.key} value={l.key}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Fond
              </Label>
              <Select
                items={BACKGROUND_ITEMS}
                value={background}
                onValueChange={(v) => setBackground(v ?? "#FFFFFF")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BACKGROUNDS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              {selected.length} / {capacity} photo{capacity > 1 ? "s" : ""} sélectionnée
              {selected.length > 1 ? "s" : ""} — le numéro indique la position dans la
              grille.
            </p>
            <ul className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {dossier.photos.map((photo) => {
                const position = selected.indexOf(photo.id);
                const isSelected = position >= 0;
                return (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => toggle(photo.id)}
                      className={cn(
                        "relative block w-full overflow-hidden rounded-lg border-2 transition-colors",
                        isSelected
                          ? "border-primary"
                          : "border-transparent hover:border-border",
                      )}
                    >
                      <SalePhotoImage
                        photoId={photo.id}
                        alt={photo.originalFileName}
                        className="aspect-square w-full object-cover"
                      />
                      {isSelected && (
                        <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                          {position + 1}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={selected.length === 0 || mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Télécharger le JPEG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
