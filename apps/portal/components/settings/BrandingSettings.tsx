"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { brandingApi, type OrganizationBranding } from "@/lib/api/branding";
import { brandingFormSchema, type BrandingFormValues } from "@/lib/schemas/branding";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { useSession } from "@/lib/auth/session-context";

const DEFAULT_ACCENT = "#c9a227";

function toFormValues(b: OrganizationBranding): BrandingFormValues {
  return {
    name: b.name,
    brandPrimaryColor: b.brandPrimaryColor ?? "",
    brandLogoUrl: b.brandLogoUrl ?? "",
    brandCoverImageUrl: b.brandCoverImageUrl ?? "",
    brandTagline: b.brandTagline ?? "",
    contactPhone: b.contactPhone ?? "",
  };
}

export function BrandingSettings() {
  const queryClient = useQueryClient();
  const { me } = useSession();
  const role = me?.organizations.find(
    (o) => o.organizationId === me.activeOrganizationId,
  )?.role;
  const canManage = role === "Owner" || role === "Admin";

  const branding = useQuery({
    queryKey: queryKeys.organization.branding(),
    queryFn: ({ signal }) => brandingApi.get(signal),
  });

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingFormSchema),
    defaultValues: {
      name: "",
      brandPrimaryColor: "",
      brandLogoUrl: "",
      brandCoverImageUrl: "",
      brandTagline: "",
      contactPhone: "",
    },
  });

  // Recharge le formulaire quand les données serveur arrivent.
  useEffect(() => {
    if (branding.data) form.reset(toFormValues(branding.data));
  }, [branding.data, form]);

  const mutation = useMutation({
    mutationFn: (values: BrandingFormValues) =>
      brandingApi.update({
        name: values.name.trim(),
        brandPrimaryColor: values.brandPrimaryColor.trim() || null,
        brandLogoUrl: values.brandLogoUrl.trim() || null,
        brandCoverImageUrl: values.brandCoverImageUrl.trim() || null,
        brandTagline: values.brandTagline.trim() || null,
        contactPhone: values.contactPhone.trim() || null,
      }),
    onSuccess: async (updated) => {
      toast.success("Marque blanche enregistrée");
      queryClient.setQueryData(queryKeys.organization.branding(), updated);
      form.reset(toFormValues(updated));
    },
    onError: (e) => toast.error(extractApiErrorMessage(e, "Enregistrement impossible.")),
  });

  if (branding.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (branding.isError) {
    return (
      <p className="text-sm text-destructive">
        Impossible de charger la configuration marque blanche.
      </p>
    );
  }

  const watched = form.watch();
  const accent = /^#[0-9a-fA-F]{6}$/.test(watched.brandPrimaryColor)
    ? watched.brandPrimaryColor
    : DEFAULT_ACCENT;
  const errors = form.formState.errors;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        {!canManage && (
          <p className="text-xs text-muted-foreground">
            Seuls les rôles Owner/Admin peuvent modifier la marque blanche.
          </p>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="branding-name">Nom affiché aux clients</Label>
          <Input id="branding-name" disabled={!canManage} {...form.register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="branding-color">Couleur d'accent</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Choisir la couleur d'accent"
              className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent p-1"
              disabled={!canManage}
              value={accent}
              onChange={(e) =>
                form.setValue("brandPrimaryColor", e.target.value, { shouldDirty: true })
              }
            />
            <Input
              id="branding-color"
              placeholder="#c9a227"
              className="w-32 font-mono"
              disabled={!canManage}
              {...form.register("brandPrimaryColor")}
            />
          </div>
          {errors.brandPrimaryColor && (
            <p className="text-xs text-destructive">{errors.brandPrimaryColor.message}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="branding-logo">URL du logo</Label>
          <Input
            id="branding-logo"
            placeholder="https://…/logo.png"
            disabled={!canManage}
            {...form.register("brandLogoUrl")}
          />
          {errors.brandLogoUrl && (
            <p className="text-xs text-destructive">{errors.brandLogoUrl.message}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="branding-cover">URL de l'image d'ambiance (écran de connexion)</Label>
          <Input
            id="branding-cover"
            placeholder="https://…/atelier.jpg"
            disabled={!canManage}
            {...form.register("brandCoverImageUrl")}
          />
          {errors.brandCoverImageUrl && (
            <p className="text-xs text-destructive">{errors.brandCoverImageUrl.message}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="branding-tagline">Signature</Label>
          <Input
            id="branding-tagline"
            placeholder="L'excellence automobile depuis 1987"
            disabled={!canManage}
            {...form.register("brandTagline")}
          />
          {errors.brandTagline && (
            <p className="text-xs text-destructive">{errors.brandTagline.message}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="branding-phone">Téléphone affiché aux clients</Label>
          <Input
            id="branding-phone"
            placeholder="+33 3 89 00 00 00"
            disabled={!canManage}
            {...form.register("contactPhone")}
          />
          {errors.contactPhone && (
            <p className="text-xs text-destructive">{errors.contactPhone.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground">
            Lien de connexion thémé :{" "}
            <span className="font-mono">/login?garage={branding.data?.slug}</span>
          </p>
          <Button type="submit" disabled={!canManage || mutation.isPending || !form.formState.isDirty}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </form>

      {/* Aperçu en direct du portail client, thémé avec les valeurs du formulaire. */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Aperçu portail client
        </p>
        <div className="overflow-hidden rounded-xl border border-border bg-[#0b0d10] text-white shadow-sm">
          <div
            className="relative h-24 bg-cover bg-center"
            style={{
              backgroundImage: watched.brandCoverImageUrl
                ? `url(${watched.brandCoverImageUrl})`
                : undefined,
              backgroundColor: "#14171c",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d10] to-transparent" />
          </div>
          <div className="-mt-8 flex flex-col gap-3 px-5 pb-5">
            {watched.brandLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL externe libre (marque blanche)
              <img
                src={watched.brandLogoUrl}
                alt="Logo du garage"
                className="relative h-10 w-fit max-w-[14rem] object-contain"
              />
            ) : (
              <span
                className="relative font-serif text-lg tracking-wide"
                style={{ color: accent }}
              >
                {watched.name || "Votre garage"}
              </span>
            )}
            <p className="text-xs text-white/60">
              {watched.brandTagline || "Votre signature apparaîtra ici."}
            </p>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/40">Votre véhicule</p>
              <p className="text-sm font-medium">Peugeot 508 · AB-123-CD</p>
              <p className="text-xs" style={{ color: accent }}>
                Révision recommandée le 12 septembre
              </p>
            </div>
            <button
              type="button"
              tabIndex={-1}
              className="pointer-events-none inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[#0b0d10]"
              style={{ backgroundColor: accent }}
            >
              <Phone className="h-3.5 w-3.5" />
              Contacter mon garage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
