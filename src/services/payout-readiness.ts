import { PayoutStatus, VendorStatus, WalletBucket } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma/client";

export const VENDOR_PAYOUT_HOLD_DAYS = 7;
export type PayoutReadinessReason = "NOT_APPROVED" | "VENDOR_SUSPENDED" | "DESTINATION_INVALID" | "FINANCIAL_RESERVATION_MISMATCH" | "WAITING_FOR_TRUSTED_DELIVERY" | "HOLD_PERIOD_ACTIVE" | "EARNING_PAYMENT_REVERSED" | "EARNING_ALLOCATION_MISSING" | "EARNING_ALLOCATION_MISMATCH" | "RETURN_PENDING" | "REFUND_PENDING" | "ACTIVE_DISPUTE" | "BLOCKING_RISK_FLAG" | "VENDOR_RISK_HOLD";
export function eligibleAt(confirmedAt: Date) { return new Date(confirmedAt.getTime() + VENDOR_PAYOUT_HOLD_DAYS * 86400000); }
export class PayoutReadinessService {
 static async evaluateWithdrawalDisbursementEligibility(payoutId: string, now = new Date()) {
  const payout = await prisma.vendorPayout.findUnique({ where:{id:payoutId}, include:{ payoutAccount:{select:{status:true,isDefault:true}}, vendor:{select:{status:true,riskFlags:{where:{status:"OPEN",scope:"VENDOR",severity:{in:["HIGH","CRITICAL"]}},select:{id:true}}}}, allocations:{include:{earningLedger:{include:{paymentAttempt:{select:{status:true}},subOrder:{include:{order:{select:{paymentStatus:true},include:{riskFlags:{where:{status:"OPEN",severity:{in:["HIGH","CRITICAL"]}},select:{id:true}}}},returnRequests:{where:{status:{in:["REQUESTED","APPROVED","RECEIVED"]}},select:{id:true}},refunds:{where:{status:{in:["REQUESTED","APPROVED","READY_FOR_PROVIDER_REFUND"]}},select:{id:true}},disputes:{where:{status:{in:["OPEN","UNDER_REVIEW"]}},select:{id:true}},riskFlags:{where:{status:"OPEN",severity:{in:["HIGH","CRITICAL"]}},select:{id:true}}}}}}}} } });
  if (!payout) return { eligible:false, reasons:["NOT_APPROVED" as PayoutReadinessReason] };
  if (payout.status !== PayoutStatus.APPROVED && payout.status !== PayoutStatus.READY_FOR_DISBURSEMENT) return { eligible:false, reasons:["NOT_APPROVED" as PayoutReadinessReason] };
  if (payout.vendor.status !== VendorStatus.ACTIVE) return { eligible:false, reasons:["VENDOR_SUSPENDED" as PayoutReadinessReason] };
  const validDestination = payout.payoutAccount?.status === "ACTIVE";
  if (!validDestination) return { eligible:false, reasons:["DESTINATION_INVALID" as PayoutReadinessReason] };
  const reserved = (await prisma.financialLedger.aggregate({where:{vendorPayoutId:payout.id,walletBucket:WalletBucket.RESERVED},_sum:{amount:true}}))._sum.amount ?? new Decimal(0);
  if (!reserved.equals(payout.amount)) return { eligible:false, reasons:["FINANCIAL_RESERVATION_MISMATCH" as PayoutReadinessReason] };
  const activeAllocations = payout.allocations.filter(a=>a.status === "ACTIVE");
  if (!activeAllocations.length) return { eligible:false,reasons:["EARNING_ALLOCATION_MISSING" as PayoutReadinessReason] };
  const lots = activeAllocations.map(a=>a.earningLedger);
  const allocationTotal = activeAllocations.reduce((sum,a)=>sum.plus(a.allocatedAmount),new Decimal(0));
  if (!allocationTotal.equals(payout.amount)) return { eligible:false,reasons:["EARNING_ALLOCATION_MISMATCH" as PayoutReadinessReason] };
  if (activeAllocations.some(a=>a.vendorId !== payout.vendorId || a.currency !== payout.currency || a.earningLedger.vendorId !== payout.vendorId || a.earningLedger.currency !== payout.currency)) return { eligible:false,reasons:["EARNING_ALLOCATION_MISMATCH" as PayoutReadinessReason] };
  if (payout.vendor.riskFlags?.length) return { eligible:false,reasons:["VENDOR_RISK_HOLD" as PayoutReadinessReason] };
  if (lots.some(l=>l.paymentAttempt?.status === "REVERSED" || l.subOrder?.order.paymentStatus === "REVERSED")) return { eligible:false,reasons:["EARNING_PAYMENT_REVERSED" as PayoutReadinessReason] };
  if (lots.some(l=>l.subOrder?.disputes?.length)) return { eligible:false,reasons:["ACTIVE_DISPUTE" as PayoutReadinessReason] };
  if (lots.some(l=>l.subOrder?.riskFlags?.length || l.subOrder?.order.riskFlags?.length)) return { eligible:false,reasons:["BLOCKING_RISK_FLAG" as PayoutReadinessReason] };
  if (lots.some(l=>l.subOrder?.refunds?.length)) return { eligible:false,reasons:["REFUND_PENDING" as PayoutReadinessReason] };
  if (lots.some(l=>l.subOrder?.returnRequests?.length)) return { eligible:false,reasons:["RETURN_PENDING" as PayoutReadinessReason] };
  if (!lots.length || lots.some(l=>!l.subOrder?.deliveryConfirmedAt || !l.subOrder.deliveryConfirmationSource)) return { eligible:false,reasons:["WAITING_FOR_TRUSTED_DELIVERY" as PayoutReadinessReason] };
  if (lots.some(l=>now < eligibleAt(l.subOrder!.deliveryConfirmedAt!))) return { eligible:false,reasons:["HOLD_PERIOD_ACTIVE" as PayoutReadinessReason] };
  return { eligible:true,reasons:[] as PayoutReadinessReason[] };
 }
 static async prepareApprovedWithdrawalForDisbursement(payoutId:string, now=new Date()) { const check=await this.evaluateWithdrawalDisbursementEligibility(payoutId,now); if(!check.eligible) return check; const payout=await prisma.vendorPayout.update({where:{id:payoutId},data:{status:PayoutStatus.READY_FOR_DISBURSEMENT,readyAt:now,merchantReference:`SD-PAYOUT-${payoutId.replaceAll("-","").slice(0,20).toUpperCase()}`}}); await prisma.auditLog.create({data:{vendorId:payout.vendorId,action:"WITHDRAWAL_READY_FOR_DISBURSEMENT",entity:"VendorPayout",entityId:payout.id,newValues:{merchantReference:payout.merchantReference}}}); return {eligible:true,reasons:[],payout}; }
}
