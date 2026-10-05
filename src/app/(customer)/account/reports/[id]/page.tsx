import { CustomerReportDetailClient } from "./CustomerReportDetailClient";

// A customer's report is private and resolved from its request-time case ID.
export const instant = false;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerReportDetailClient reportId={id} />;
}
