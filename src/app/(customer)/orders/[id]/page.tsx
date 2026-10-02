import { Suspense } from "react";
import { OrderDetailClient, OrderDetailFallback } from "./OrderDetailClient";

type OrderDetailPageProps = { params: Promise<{ id: string }> };

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return <Suspense fallback={<OrderDetailFallback />}><OrderDetailRuntime params={params} /></Suspense>;
}

async function OrderDetailRuntime({ params }: OrderDetailPageProps) {
  const { id } = await params;
  return <OrderDetailClient orderId={id} />;
}
