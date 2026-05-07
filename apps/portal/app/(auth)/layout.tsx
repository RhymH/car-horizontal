import { Wrench } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-primary via-primary/85 to-primary/60 p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-white/15">
            <Wrench className="size-4" />
          </span>
          CarHorizontal
        </div>
        <div className="space-y-3">
          <p className="text-2xl font-medium leading-snug">
            « Mes mécaniciens enregistrent les interventions en deux clics et
            les rappels partent tout seuls. »
          </p>
          <p className="text-sm text-primary-foreground/80">
            Karim — Garage Saint-Pierre, Toulouse
          </p>
        </div>
        <div className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} CarHorizontal — CRM pour garages.
        </div>
      </aside>
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
