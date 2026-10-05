import { AdminVerificationDetailClient } from "./AdminVerificationDetailClient";

// Verification cases are private, request-time operational records.
export const instant = false;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminVerificationDetailClient reportId={id} />;
}
