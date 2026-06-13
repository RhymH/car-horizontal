"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, TextField, Button, FormError } from "@/components/ui";
import { portalApi, apiErrorMessage } from "@/lib/api/portal";
import { tokenStore } from "@/lib/auth/tokens";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const session = await portalApi.login(email.trim(), password);
      tokenStore.set({
        ...session.tokens,
        customerId: session.customerId,
        fullName: session.fullName,
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Email ou mot de passe incorrect."));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell title="Mon véhicule" subtitle="Connectez-vous pour suivre votre véhicule.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label="Adresse e-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@email.fr"
        />
        <TextField
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={error} />
        <Button type="submit" pending={pending}>
          Se connecter
        </Button>
      </form>
    </AuthShell>
  );
}
