"use client";

import * as React from "react";
import { vendorPromotionsClient, type CreatedPromotion, type PlatformPaymentReadiness, type VendorEntitlement, type VendorPromotionList, type VendorPromotionProduct, type VendorPromotionQuote, type VendorPromotionQuoteInput } from "@/lib/vendor-promotions-client";

const messageOf = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export function useVendorMarketingList(input: { page: number; pageSize: number; search: string; status: string }) {
  const [result, setResult] = React.useState<VendorPromotionList>({ rows: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });
  const [entitlement, setEntitlement] = React.useState<VendorEntitlement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const refresh = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ page: String(input.page), pageSize: String(input.pageSize) });
      if (input.search) query.set("search", input.search);
      if (input.status !== "ALL") query.set("status", input.status);
      const [campaigns, benefits] = await Promise.all([vendorPromotionsClient.list(query, signal), vendorPromotionsClient.entitlement(signal)]);
      if (!signal?.aborted) { setResult(campaigns); setEntitlement(benefits); }
    } catch (cause) { if (!signal?.aborted) setError(messageOf(cause, "Unable to load marketing data.")); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [input.page, input.pageSize, input.search, input.status]);
  React.useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => void refresh(controller.signal), 0); return () => { window.clearTimeout(timer); controller.abort(); }; }, [refresh]);
  return { result, entitlement, loading, error, refresh };
}

export function usePromotionBooking(onChanged: () => Promise<unknown> | void) {
  const [quote, setQuote] = React.useState<VendorPromotionQuote | null>(null);
  const [products, setProducts] = React.useState<VendorPromotionProduct[]>([]);
  const [productLoading, setProductLoading] = React.useState(false);
  const [productError, setProductError] = React.useState("");
  const [quoting, setQuoting] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [paymentReadiness, setPaymentReadiness] = React.useState<PlatformPaymentReadiness | null>(null);
  const [created, setCreated] = React.useState<CreatedPromotion | null>(null);
  const [paymentState, setPaymentState] = React.useState<"IDLE"|"PENDING"|"FAILED">("IDLE");
  const quoteRequest = React.useRef(0), searchRequest = React.useRef(0), searchAbort = React.useRef<AbortController | null>(null), idempotencyKey = React.useRef(crypto.randomUUID()), paymentKey = React.useRef(crypto.randomUUID());
  React.useEffect(()=>{const controller=new AbortController();void vendorPromotionsClient.paymentReadiness(controller.signal).then(setPaymentReadiness).catch(()=>{if(!controller.signal.aborted)setPaymentReadiness({provider:"MTN",ready:false,readiness:"UNAVAILABLE"})});return()=>controller.abort();},[]);
  const searchProducts = React.useCallback(async (query: string) => { const generation=++searchRequest.current; searchAbort.current?.abort(); const controller=new AbortController(); searchAbort.current=controller; setProductLoading(true); setProductError(""); try { const rows=await vendorPromotionsClient.searchProducts(query,controller.signal); if(generation===searchRequest.current)setProducts(rows.filter(row=>row.status==="ACTIVE"||row.status==="PUBLISHED")); } catch(cause){if(!controller.signal.aborted&&generation===searchRequest.current)setProductError(messageOf(cause,"Unable to search products."));} finally{if(generation===searchRequest.current)setProductLoading(false);} },[]);
  const requestQuote = React.useCallback(async (input: VendorPromotionQuoteInput) => { const generation=++quoteRequest.current; setQuoting(true); setMessage(""); setQuote(null); try { const next=await vendorPromotionsClient.quote(input); if(generation===quoteRequest.current)setQuote(next); return next; } catch(cause){if(generation===quoteRequest.current)setMessage(messageOf(cause,"Unable to calculate promotion pricing.")); return null;} finally{if(generation===quoteRequest.current)setQuoting(false);} },[]);
  const invalidateQuote = React.useCallback(() => { ++quoteRequest.current; setQuote(null); setCreated(null); setPaymentState("IDLE"); },[]);
  const createCampaign = React.useCallback(async () => { if(submitting||!quote)return null; setSubmitting(true); setMessage(""); try { const campaign=await vendorPromotionsClient.create({quoteId:quote.quoteId,idempotencyKey:idempotencyKey.current}); setCreated(campaign); if(Number(campaign.amountDue)===0){setMessage("Promotion confirmed using promotional credit."); await onChanged();} else setMessage("A temporary slot hold was created. Request payment before it expires."); return campaign;} catch(cause){setMessage(messageOf(cause,"Unable to reserve this promotion. Review availability and try again."));return null;} finally{setSubmitting(false);} },[onChanged,quote,submitting]);
  const requestPayment = React.useCallback(async (phone:string) => { if(!created||submitting)return; if(!phone.trim()){setMessage("Enter the MTN Mobile Money number.");return;} setSubmitting(true);setMessage("");try{if(!paymentReadiness?.ready)throw new Error("MTN payment requests are currently unavailable.");await vendorPromotionsClient.initiatePayment({revenueOrderId:created.revenueOrderId,payerPhone:phone.trim(),idempotencyKey:paymentKey.current});setPaymentState("PENDING");setMessage("Payment request sent. Approve it on your phone; confirmation may take a few minutes.");await onChanged();}catch(cause){setPaymentState("FAILED");setMessage(messageOf(cause,"Unable to request payment. You can retry safely."));}finally{setSubmitting(false);} },[created,onChanged,paymentReadiness,submitting]);
  const reset = React.useCallback(()=>{setQuote(null);setCreated(null);setMessage("");setPaymentState("IDLE");idempotencyKey.current=crypto.randomUUID();paymentKey.current=crypto.randomUUID();},[]);
  React.useEffect(()=>()=>searchAbort.current?.abort(),[]);
  return { quote, products, productLoading, productError, quoting, submitting, message, paymentReadiness, paymentState, created, searchProducts, requestQuote, invalidateQuote, createCampaign, requestPayment, reset };
}
