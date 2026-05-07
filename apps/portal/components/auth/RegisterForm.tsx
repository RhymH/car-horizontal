"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { registerSchema, type RegisterValues } from "@/lib/schemas/auth";
import { tokenStore } from "@/lib/auth/tokens";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import type { RegisterResponse } from "@/lib/api/types";

export function RegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const password = watch("password") ?? "";

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const problem = await res.json().catch(() => ({}));
        toast.error("Inscription impossible", {
          description:
            problem?.detail ?? problem?.title ?? "Réessayez dans un instant.",
        });
        return;
      }
      const data = (await res.json()) as Pick<
        RegisterResponse,
        "userId" | "organizationId" | "organizationName"
      > & { tokens: { accessToken: string; accessTokenExpiresAt: string; refreshTokenExpiresAt: string } };
      tokenStore.setFromTokens(
        {
          accessToken: data.tokens.accessToken,
          accessTokenExpiresAt: data.tokens.accessTokenExpiresAt,
          refreshToken: "",
          refreshTokenExpiresAt: data.tokens.refreshTokenExpiresAt,
        },
        data.organizationId,
      );
      toast.success(`${data.organizationName} est prêt`, {
        description: "Bienvenue sur CarHorizontal.",
      });
      router.push("/dashboard");
    } catch {
      toast.error("Inscription impossible", {
        description: "Le serveur est injoignable.",
      });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Créer mon compte
        </h1>
        <p className="text-sm text-muted-foreground">
          Démarrez votre garage en moins d&apos;une minute. Un garage à votre
          nom est créé automatiquement.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nom complet</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Karim Benali"
            aria-invalid={!!errors.fullName || undefined}
            {...register("fullName")}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive">
              {errors.fullName.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@garage.fr"
            aria-invalid={!!errors.email || undefined}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password || undefined}
            {...register("password")}
          />
          <PasswordStrengthMeter password={password} />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Créer mon compte
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  );
}
