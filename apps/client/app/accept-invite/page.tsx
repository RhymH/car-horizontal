"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, TextField, Button, FormError } from "@/components/ui";
import { portalApi, apiErrorMessage } from "@/lib/api/portal";
import { tokenStore } from "@/lib/auth/tokens";
import { useBranding } from "@/lib/branding";

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useBranding();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const linkValid = email.length > 0 && token.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    try {
      const session = await portalApi.acceptInvite(email, token, password);
      tokenStore.set({
        ...session.tokens,
        customerId: session.customerId,
        fullName: session.fullName,
      });
      // Adopte la marque blanche du garage qui a invité ce client.
      void refresh();
      router.replace("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Lien d'invitation invalide ou expiré."));
    } finally {
      setPending(false);
    }
  }

  if (!linkValid) {
    return (
      <AuthShell title="Lien invalide">
        <FormError message="Ce lien d'invitation est incomplet. Demandez à votre garage de vous le renvoyer." />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Bienvenue dans votre espace"
      subtitle={`Définissez votre mot de passe pour ${email}.`}
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <TextField
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <FormError message={error} />
        <Button type="submit" pending={pending}>
          Activer mon espace
        </Button>
      </form>
    </AuthShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
