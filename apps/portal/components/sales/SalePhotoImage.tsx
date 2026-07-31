"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImageOff, Loader2 } from "lucide-react";
import { salesApi } from "@/lib/api/sales";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

/**
 * Affiche une photo d'annonce. L'API protège le binaire par le jeton Bearer, donc
 * on ne peut pas pointer une balise <img> directement dessus : on télécharge le
 * blob puis on en dérive un object URL, révoqué au démontage.
 */
export function SalePhotoImage({
  photoId,
  thumbnail = true,
  alt,
  className,
}: {
  photoId: string;
  thumbnail?: boolean;
  alt: string;
  className?: string;
}) {
  const query = useQuery({
    queryKey: queryKeys.sales.photo(photoId, thumbnail),
    queryFn: ({ signal }) => salesApi.fetchPhotoBlob(photoId, thumbnail, signal),
    // Le contenu d'une photo ne change jamais : un nouvel upload crée un nouvel id.
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  const blob = query.data;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Création et révocation doivent vivre dans le même effet. Dériver l'URL d'un
  // useMemo paraît plus simple, mais le double-montage de StrictMode révoque
  // alors une URL que le memo ne recrée pas — l'image reste cassée en dev.
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cycle create/revoke indissociable
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [blob]);

  if (query.isError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="size-5" />
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- object URL local, next/image ne sait pas l'optimiser
  return <img src={objectUrl} alt={alt} className={className} />;
}
