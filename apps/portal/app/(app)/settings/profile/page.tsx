import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileSettings } from "@/components/settings/ProfileSettings";

export default function ProfilePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Profil"
        description="Votre compte utilisateur et vos accès aux garages."
      />
      <ProfileSettings />
    </div>
  );
}
