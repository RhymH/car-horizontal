import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { MobileNav } from "@/components/layout/MobileNav";
import { OrgSwitcher } from "@/components/layout/OrgSwitcher";
import { UserMenu } from "@/components/layout/UserMenu";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <MobileNav />
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />
        <OrgSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
