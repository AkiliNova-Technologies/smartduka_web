"use client";

import { use, useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Package, ShieldCheck } from "lucide-react";
import { useUserData } from "@/providers/UserDataProvider";
import { getProductAction } from "@/actions/product";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ItemDetail {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  brand: string;
}

interface OrderItem {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
}

function OrderDetailSkeleton() {
  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div className="flex items-center gap-3 border-b border-border/40 pb-4">
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="h-4 w-48 rounded-md" />
      </div>
      <Skeleton className="h-24 rounded-[24px]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 rounded-[24px]" />
        <Skeleton className="h-32 rounded-[24px] md:col-span-2" />
      </div>
      <Skeleton className="h-64 rounded-[24px]" />
    </div>
  );
}

export default function OrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { orders, ordersLoading } = useUserData();
  const [itemDetails, setItemDetails] = useState<ItemDetail[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const order = orders.find((o: OrderItem) => o.id === id);

  useEffect(() => {
    if (!order) return;

    const fetchItems = async () => {
      setLoadingItems(true);
      const details = await Promise.all(
        order.items.map(async (item: { productId: string; name: string; quantity: number; price: number }) => {
          try {
            const result = await getProductAction(item.productId);
            if (result.success && result.data) {
              const product = result.data as { name?: string; image?: string; brand?: string };
              return {
                productId: item.productId,
                name: product.name || item.name,
                price: item.price,
                quantity: item.quantity,
                image: product.image || "",
                brand: product.brand || "Unknown",
              };
            }
          } catch {
            // fallback
          }
          return {
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: "",
            brand: "Unknown",
          };
        })
      );
      setItemDetails(details);
      setLoadingItems(false);
    };

    fetchItems();
  }, [order]);

  if (ordersLoading && orders.length === 0) return <OrderDetailSkeleton />;
  if (!order) notFound();

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 selection:bg-emerald-500/10 selection:text-emerald-700">
      <div className="flex items-center justify-between border-b border-border/40 pb-4 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/orders")}
            className="p-2 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <Link href="/orders" className="hover:text-primary transition-colors">
                Orders
              </Link>
            </nav>
            <h1 className="text-xl font-medium tracking-tight text-foreground mt-0.5">
              Order #{order.orderNumber}
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center h-8 px-3.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${
            order.status === "DELIVERED"
              ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20"
              : order.status === "SHIPPED"
                ? "bg-blue-500/5 text-blue-600 border-blue-500/20"
                : "bg-amber-500/5 text-amber-600 border-amber-500/20"
          }`}>
          {order.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="bg-card text-card-foreground rounded-[24px] border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60 flex items-center gap-2">
          <Package className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            {order.items.length} {order.items.length === 1 ? "Item" : "Items"}
          </h3>
        </div>
        <div className="divide-y divide-border/60">
          {loadingItems
            ? Array.from({ length: order.items.length }).map((_, i) => (
                <div key={i} className="p-4 sm:p-5 flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-20 rounded-md" />
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-3 w-12 rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
              ))
            : itemDetails.map((item) => (
                <div
                  key={item.productId}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900 border border-border/40 relative shrink-0">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                        {item.brand}
                      </span>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1">
                        {item.name}
                      </h4>
                      <span className="inline-block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-muted border border-border/20 px-1.5 py-0.5 rounded">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>
                  <div className="text-right w-full sm:w-auto pt-2 sm:pt-0 border-t border-dashed border-border sm:border-0 flex sm:block items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block sm:hidden">
                      Price
                    </span>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                      UGX {item.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
        </div>
        <div className="p-5 bg-muted/40 border-t border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>Secured via Platform Escrow</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Total Paid
            </span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              UGX {order.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}