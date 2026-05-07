import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ToastDemoButton } from "@/components/landing/toast-demo-button";

export default function HomePage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-linear-to-br from-background via-background to-accent/40 px-6 py-20">
      <main className="flex w-full max-w-2xl flex-col gap-10">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            CarHorizontal
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Le CRM des garages, pensé pour la mécanique.
          </h1>
          <p className="text-lg text-muted-foreground">
            Fiches clients, historique d&apos;entretien, rappels automatiques
            et rendez-vous — tout au même endroit.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Se connecter
          </Link>
          <Link
            href="/register"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Créer un compte
          </Link>
          <ToastDemoButton />
        </div>
      </main>
    </div>
  );
}
