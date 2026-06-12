import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { PluginsSettings } from "@/components/settings/PluginsSettings";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Paramètres"
        description="Modules et options de votre garage."
      />
      <SectionCard
        title="Modules (plugins)"
        description="Activez les fonctionnalités adaptées à votre activité. Désactiver un module masque ses écrans et bloque ses accès."
      >
        <PluginsSettings />
      </SectionCard>
    </div>
  );
}
