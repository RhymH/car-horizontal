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
import { loginSchema, type LoginValues } from "@/lib/schemas/auth";
import { tokenStore } from "@/lib/auth/tokens";
import type { LoginResponse } from "@/lib/api/types";

export function LoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const problem = await res.json().catch(() => ({}));
        toast.error("Connexion impossible", {
          description:
            problem?.detail ?? problem?.title ?? "Identifiants invalides.",
        });
        return;
      }
      const data = (await res.json()) as Pick<
        LoginResponse,
        "userId" | "activeOrganizationId"
      > & { tokens: { accessToken: string; accessTokenExpiresAt: string; refreshTokenExpiresAt: string } };
      tokenStore.setFromTokens(
        {
          accessToken: data.tokens.accessToken,
          accessTokenExpiresAt: data.tokens.accessTokenExpiresAt,
          refreshToken: "",
          refreshTokenExpiresAt: data.tokens.refreshTokenExpiresAt,
        },
        data.activeOrganizationId,
      );
      toast.success("Bienvenue sur CarHorizontal");
      router.push("/dashboard");
    } catch {
      toast.error("Connexion impossible", {
        description: "Le serveur est injoignable.",
      });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
        <p className="text-sm text-muted-foreground">
          Accédez à votre espace garage.
        </p>
      </div>

      <div className="space-y-4">
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
            autoComplete="current-password"
            aria-invalid={!!errors.password || undefined}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Se connecter
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
