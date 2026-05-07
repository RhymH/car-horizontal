import { VehicleDetailView } from "@/components/vehicles/VehicleDetailView";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VehicleDetailView vehicleId={id} />;
}
