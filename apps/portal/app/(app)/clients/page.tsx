import {
  CustomersListView,
  type ViewTab,
} from "@/components/customers/CustomersListView";

const VIEW_TABS: readonly ViewTab[] = ["all", "clients", "prospects"];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const initialView = VIEW_TABS.includes(view as ViewTab)
    ? (view as ViewTab)
    : "all";
  return <CustomersListView key={initialView} initialView={initialView} />;
}
