import PrescriptionApp from "@/components/sut/PrescriptionApp";
import { SutProvider } from "@/lib/sut/SutProvider";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <SutProvider token={token}>
      <PrescriptionApp token={token} />
    </SutProvider>
  );
}
