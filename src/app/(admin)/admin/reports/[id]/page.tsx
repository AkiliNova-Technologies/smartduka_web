import { AdminReportDetailClient } from "./AdminReportDetailClient";

// Moderation cases are authenticated, private, and keyed by request-time IDs.
// They intentionally render as blocking operational routes rather than a shared shell.
export const instant = false;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminReportDetailClient reportId={id} />;
}
