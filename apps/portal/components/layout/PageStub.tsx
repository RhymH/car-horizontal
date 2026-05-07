import type { LucideIcon } from "lucide-react";

export function PageStub({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-8 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="text-xs text-muted-foreground">Bientôt disponible.</p>
    </div>
  );
}
