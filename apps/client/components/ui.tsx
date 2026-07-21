"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranding } from "@/lib/branding";

/**
 * Identité du garage : logo marque blanche si configuré, sinon le nom du
 * garage en serif, sinon la marque produit en dernier recours.
 */
export function BrandMark({ className }: { className?: string }) {
  const { branding } = useBranding();

  if (branding?.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL externe libre (marque blanche)
      <img
        src={branding.logoUrl}
        alt={branding.garageName}
        className={cn("h-9 w-auto max-w-52 object-contain", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "font-display text-xl tracking-wide text-brand",
        className,
      )}
    >
      {branding?.garageName ?? "CarHorizontal"}
    </span>
  );
}

/**
 * Écran d'authentification scindé : volet ambiance (image du garage, signature)
 * et volet formulaire. Sur mobile, seul le formulaire subsiste, posé sur le
 * halo de la couleur du garage.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { branding } = useBranding();

  return (
    <main className="min-h-svh lg:grid lg:grid-cols-[1.1fr_1fr]">
      <aside className="grain relative hidden overflow-hidden lg:block">
        {branding?.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externe libre (marque blanche)
          <img
            src={branding.coverImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(50rem 34rem at 20% 20%, color-mix(in oklab, var(--brand) 22%, transparent), transparent 60%), linear-gradient(150deg, #14161c, #060709)",
            }}
          />
        )}
        {/* Voile : garantit la lisibilité quelle que soit l'image choisie. */}
        <div className="absolute inset-0 bg-linear-to-t from-abyss via-abyss/45 to-abyss/15" />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <BrandMark className="h-11 rise" />
          <div className="max-w-md">
            <p className="micro-label rise" style={{ "--d": "150ms" } as React.CSSProperties}>
              {branding?.garageName ?? "Votre garage"}
            </p>
            <p
              className="rise mt-4 font-display text-4xl leading-tight text-ink"
              style={{ "--d": "260ms" } as React.CSSProperties}
            >
              {branding?.tagline ?? "Votre véhicule, suivi avec le soin qu'il mérite."}
            </p>
          </div>
        </div>
      </aside>

      <section className="flex min-h-svh items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="rise mb-12 lg:hidden">
            <BrandMark />
          </div>
          <p className="micro-label rise" style={{ "--d": "80ms" } as React.CSSProperties}>
            Espace client
          </p>
          <h1
            className="rise mt-3 font-display text-3xl text-ink"
            style={{ "--d": "160ms" } as React.CSSProperties}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="rise mt-2 text-base leading-relaxed text-ink-mute"
              style={{ "--d": "240ms" } as React.CSSProperties}
            >
              {subtitle}
            </p>
          )}
          <div className="rise mt-9" style={{ "--d": "320ms" } as React.CSSProperties}>
            {children}
          </div>
          <p
            className="rise mt-14 text-center text-xs tracking-wide text-ink-faint"
            style={{ "--d": "420ms" } as React.CSSProperties}
          >
            Espace client propulsé par CarHorizontal
          </p>
        </div>
      </section>
    </main>
  );
}

export function TextField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="micro-label mb-2 block">{label}</span>
      <input
        {...props}
        className={cn(
          "w-full rounded-xl border border-line bg-panel-soft px-4 py-3 text-base text-ink",
          "placeholder:text-ink-faint",
          "outline-none transition-[border-color,box-shadow] duration-200",
          "focus:border-brand/60 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_18%,transparent)]",
        )}
      />
    </label>
  );
}

export function Button({
  pending,
  className,
  children,
  ...props
}: { pending?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3",
        "text-base font-semibold tracking-wide text-brand-ink",
        "transition-[transform,filter,box-shadow] duration-200",
        "hover:-translate-y-px hover:brightness-110 hover:shadow-[0_10px_28px_-10px_color-mix(in_oklab,var(--brand)_60%,transparent)]",
        "active:translate-y-0 disabled:pointer-events-none disabled:opacity-55",
        className,
      )}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function GhostButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-line bg-transparent px-4 py-2",
        "text-sm text-ink-mute transition-colors duration-200",
        "hover:border-brand/40 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-base text-danger">
      {message}
    </p>
  );
}

/**
 * Modale premium : feuille en bas d'écran sur mobile, carte centrée sur
 * desktop. Fond flouté, fermeture par la croix, le voile ou Échap.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
    >
      <button
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-abyss/70 backdrop-blur-sm"
      />
      <div className="panel rise relative w-full max-w-md rounded-b-none p-6 sm:rounded-b-[1.25rem] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink-mute transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Écran d'attente plein écran, aux couleurs du garage. */
export function SplashScreen() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6">
      <BrandMark className="rise" />
      <Loader2
        className="rise h-5 w-5 animate-spin text-ink-faint"
        style={{ "--d": "150ms" } as React.CSSProperties}
      />
    </main>
  );
}
