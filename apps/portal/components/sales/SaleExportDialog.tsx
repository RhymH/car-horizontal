"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { salesApi } from "@/lib/api/sales";
import { downloadBlob } from "@/lib/hooks/useSaleDossier";

/**
 * Récapitulatif texte du dossier — véhicule, carte grise, prix, annonces publiées.
 * À copier dans un mail au service des cartes grises, ou à joindre à un acheteur.
 */
export function SaleExportDialog({
  open,
  onOpenChange,
  vehicleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
}) {
  // Les montants confidentiels sont exclus par défaut : ce texte finit souvent
  // dans un mail à l'acheteur ou au service des cartes grises.
  const [includeInternal, setIncludeInternal] = useState(false);

  const query = useQuery({
    queryKey: ["sales", "export", vehicleId, includeInternal],
    queryFn: () => salesApi.exportDossier(vehicleId, includeInternal),
    enabled: open,
    // Le dossier bouge à chaque saisie : on ne garde pas un export périmé.
    staleTime: 0,
  });

  async function copy() {
    if (!query.data) return;
    try {
      await navigator.clipboard.writeText(query.data.text);
      toast.success("Dossier copié dans le presse-papiers");
    } catch {
      toast.error("Copie impossible depuis ce navigateur.");
    }
  }

  function download() {
    if (!query.data) return;
    downloadBlob(
      new Blob([query.data.text], { type: "text/plain;charset=utf-8" }),
      query.data.fileName,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exporter le dossier</DialogTitle>
          <DialogDescription>
            Toutes les informations du véhicule, y compris ce qui manque encore pour
            l&apos;immatriculation. Prêt à envoyer à un acheteur ou au service des
            cartes grises.
          </DialogDescription>
        </DialogHeader>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeInternal}
            onCheckedChange={(v) => setIncludeInternal(v === true)}
          />
          Inclure les montants internes (prix d&apos;achat, marge, notes)
        </label>

        {query.isLoading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : query.isError ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Export indisponible.
          </p>
        ) : (
          <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs">
            {query.data?.text}
          </pre>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={copy} disabled={!query.data}>
            <Copy className="size-4" />
            Copier
          </Button>
          <Button type="button" onClick={download} disabled={!query.data}>
            <Download className="size-4" />
            Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
