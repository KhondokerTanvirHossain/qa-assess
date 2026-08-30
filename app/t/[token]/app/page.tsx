import PrescriptionApp from "@/components/sut/PrescriptionApp";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PrescriptionApp />;
}
