import { AdvertisingPlacement, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireAdminContext } from "@/lib/auth/admin-context";

export type BookingInterval = { startAt: Date; endAt: Date };
export type PromotionTransaction = Pick<typeof prisma,
  | "$queryRaw"
  | "advertisingPlacementInventory"
  | "auditLog"
  | "notification"
  | "platformPaymentIntent"
  | "platformRevenueOrder"
  | "product"
  | "promotionCampaign"
  | "promotionCreditLedger"
  | "promotionQuote"
  | "promotionReservation"
  | "vendorSubscription"
>;
type Tx = PromotionTransaction;

export class PromotionCapacityError extends Error {
  code = "PROMOTION_CAPACITY_FULL";
  constructor(readonly alternatives: Date[] = []) { super("This placement is full for the selected dates."); }
}
export class PromotionQuoteExpiredError extends Error { code = "PROMOTION_QUOTE_EXPIRED"; constructor() { super("This promotion quote has expired. Review the booking again."); } }
export class PromotionCapacityReductionError extends Error {
  code = "PROMOTION_CAPACITY_REDUCTION_CONFLICT";
  constructor(readonly confirmedPeak: number) { super(`Capacity cannot be reduced below ${confirmedPeak} while confirmed bookings are active or scheduled.`); }
}

/** Peak simultaneous occupancy for half-open intervals. End events sort first, so back-to-back bookings do not overlap. */
export function peakOccupancy(intervals: BookingInterval[]) {
  const events = intervals.flatMap(({ startAt, endAt }) => [{ at: startAt.getTime(), delta: 1 }, { at: endAt.getTime(), delta: -1 }]).sort((a,b)=>a.at-b.at||a.delta-b.delta);
  let current=0, peak=0;
  for(const event of events){current+=event.delta;peak=Math.max(peak,current);}
  return peak;
}

export class PromotionInventoryService {
  static placementFor(targetType: "PRODUCT"|"SHOP") { return targetType === "PRODUCT" ? AdvertisingPlacement.HOMEPAGE_FEATURED_PRODUCTS : AdvertisingPlacement.HOMEPAGE_FEATURED_SHOPS; }
  static async lock(tx: Tx, placement: AdvertisingPlacement) { await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`promotion:${placement}`}))::text AS lock`; }
  static async lockVendorCredits(tx: Tx, vendorId: string) { await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`promotion-credit:${vendorId}`}))::text AS lock`; }

  static async intervals(tx: Tx, placement: AdvertisingPlacement, requested: BookingInterval, now: Date, excludeCampaignId?: string) {
    const reservations = await tx.promotionReservation.findMany({ where: { placement, campaignId: excludeCampaignId ? { not: excludeCampaignId } : undefined, startAt: { lt: requested.endAt }, endAt: { gt: requested.startAt }, OR: [{ status: "CONFIRMED" }, { status: "HOLD", holdExpiresAt: { gt: now } }] }, select: { startAt: true, endAt: true } });
    const legacy = await tx.promotionCampaign.findMany({ where: { placement, id: excludeCampaignId ? { not: excludeCampaignId } : undefined, reservation: null, status: { in: ["ACTIVE","SCHEDULED"] }, startAt: { lt: requested.endAt }, endAt: { gt: requested.startAt } }, select: { startAt: true, endAt: true } });
    return [...reservations, ...legacy.flatMap(row=>row.startAt&&row.endAt?[{startAt:row.startAt,endAt:row.endAt}]:[])];
  }

  static async availability(tx: Tx, placement: AdvertisingPlacement, requested: BookingInterval, now=new Date(), excludeCampaignId?: string) {
    const inventory = await tx.advertisingPlacementInventory.findUnique({ where: { placement } });
    if (!inventory?.isActive) throw new Error("This advertising placement is unavailable.");
    const intervals = await this.intervals(tx, placement, requested, now, excludeCampaignId);
    const peak = peakOccupancy(intervals);
    const available = Math.max(0, inventory.capacity - peak);
    const alternatives: Date[] = [];
    if (!available && intervals.length) {
      const duration = requested.endAt.getTime() - requested.startAt.getTime();
      let cursor = Math.min(...intervals.map((row) => row.endAt.getTime()));
      for (let attempt = 0; attempt < 24 && alternatives.length < 3; attempt++) {
        const candidate = { startAt: new Date(cursor), endAt: new Date(cursor + duration) };
        const conflicts = await this.intervals(tx, placement, candidate, now, excludeCampaignId);
        if (peakOccupancy(conflicts) < inventory.capacity) {
          alternatives.push(candidate.startAt);
          cursor += 86_400_000;
        } else {
          const nextBoundary = conflicts.map((row) => row.endAt.getTime()).filter((value) => value > cursor).sort((a,b) => a-b)[0];
          cursor = nextBoundary ?? cursor + 86_400_000;
        }
      }
    }
    return { placement, capacity: inventory.capacity, occupied: peak, available, alternatives };
  }
  static async assertAndReserve(tx: Tx, input: { campaignId:string; placement:AdvertisingPlacement; startAt:Date; endAt:Date; status:"HOLD"|"CONFIRMED"; holdExpiresAt?:Date|null }, now=new Date()) {
    await this.lock(tx,input.placement);
    const availability=await this.availability(tx,input.placement,input,now,input.campaignId);
    if(availability.available<1)throw new PromotionCapacityError(availability.alternatives);
    return tx.promotionReservation.upsert({where:{campaignId:input.campaignId},update:{placement:input.placement,startAt:input.startAt,endAt:input.endAt,status:input.status,holdExpiresAt:input.holdExpiresAt??null,confirmedAt:input.status==="CONFIRMED"?now:null},create:{campaignId:input.campaignId,placement:input.placement,startAt:input.startAt,endAt:input.endAt,status:input.status,holdExpiresAt:input.holdExpiresAt??null,confirmedAt:input.status==="CONFIRMED"?now:null}});
  }

  static async confirmPaid(tx:Tx,campaign:{id:string;placement:AdvertisingPlacement;requestedStartAt:Date|null;durationDays:number},now=new Date()){
    const startAt=campaign.requestedStartAt&&campaign.requestedStartAt>now?campaign.requestedStartAt:now,endAt=new Date(startAt.getTime()+campaign.durationDays*86_400_000);
    try{
      await this.assertAndReserve(tx,{campaignId:campaign.id,placement:campaign.placement,startAt,endAt,status:"CONFIRMED"},now);
      await tx.promotionCampaign.update({where:{id:campaign.id},data:{startAt,endAt,status:startAt>now?"SCHEDULED":"ACTIVE",fulfillmentStatus:startAt>now?"CONFIRMED":"DELIVERING"}});
      return true;
    }catch(error){
      if(!(error instanceof PromotionCapacityError))throw error;
      await tx.promotionReservation.updateMany({where:{campaignId:campaign.id},data:{status:"RECOVERY_REQUIRED",holdExpiresAt:null}});
      await tx.promotionCampaign.update({where:{id:campaign.id},data:{status:"REVIEW_REQUIRED",fulfillmentStatus:"RECOVERY_REQUIRED"}});
      return false;
    }
  }

  static async confirmPaidWithCreditRecovery(tx:Tx,campaign:{id:string;vendorId:string;placement:AdvertisingPlacement;requestedStartAt:Date|null;durationDays:number},creditApplied:number,now=new Date()){
    await this.lock(tx,campaign.placement);
    await this.lockVendorCredits(tx,campaign.vendorId);
    const releaseKey=`promotion-credit-release:${campaign.id}`,released=creditApplied>0?await tx.promotionCreditLedger.findUnique({where:{releaseKey}}):null;
    if(released){
      const entries=await tx.promotionCreditLedger.findMany({where:{vendorId:campaign.vendorId,OR:[{expiresAt:null},{expiresAt:{gt:now}}]},select:{amount:true}}),available=Math.max(0,entries.reduce((sum,row)=>sum+Number(row.amount),0));
      if(available<creditApplied){
        await tx.promotionReservation.updateMany({where:{campaignId:campaign.id},data:{status:"RECOVERY_REQUIRED",holdExpiresAt:null}});
        await tx.promotionCampaign.update({where:{id:campaign.id},data:{status:"REVIEW_REQUIRED",fulfillmentStatus:"RECOVERY_REQUIRED"}});
        return false;
      }
    }
    const confirmed=await this.confirmPaid(tx,campaign,now);
    if(confirmed&&released)await tx.promotionCreditLedger.create({data:{vendorId:campaign.vendorId,campaignId:campaign.id,type:"REDEMPTION",amount:-creditApplied,reason:"LATE_PAYMENT_CREDIT_REACQUIRED"}});
    return confirmed;
  }

  static async release(tx:Tx,campaignId:string,status:"CANCELLED"|"EXPIRED"="CANCELLED"){
    return tx.promotionReservation.updateMany({where:{campaignId,status:"HOLD"},data:{status,holdExpiresAt:null}});
  }

  static async assertCapacitySupportsCommitments(tx:Tx,placement:AdvertisingPlacement,capacity:number,now=new Date()){
    const confirmed=await tx.promotionReservation.findMany({where:{placement,status:"CONFIRMED",endAt:{gt:now}},select:{startAt:true,endAt:true}}),peak=peakOccupancy(confirmed);
    if(capacity<peak)throw new PromotionCapacityReductionError(peak);
    return peak;
  }

  static async runSerializable<T>(work:(tx:Tx)=>Promise<T>, attempts=3):Promise<T>{for(let attempt=1;;attempt++){try{return await prisma.$transaction(tx=>work(tx),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:5_000,timeout:15_000});}catch(error){if(attempt>=attempts||!(error&&typeof error==="object"&&"code" in error&&error.code==="P2034"))throw error;}}}

  static async adminState(){await requireAdminContext("platform:manage_billing");const now=new Date(),[inventories,recovery]=await Promise.all([prisma.advertisingPlacementInventory.findMany({orderBy:{placement:"asc"}}),prisma.promotionCampaign.findMany({where:{fulfillmentStatus:{in:["RECOVERY_REQUIRED","INELIGIBLE"]}},include:{vendor:{select:{storeName:true}},product:{select:{name:true}},revenueOrder:true,reservation:true},orderBy:{updatedAt:"desc"}})]);const conflicts=[] as Array<{placement:AdvertisingPlacement;capacity:number;peak:number}>;for(const inventory of inventories){const rows=await prisma.promotionReservation.findMany({where:{placement:inventory.placement,status:"CONFIRMED",endAt:{gt:now}},select:{startAt:true,endAt:true}}),peak=peakOccupancy(rows);if(peak>inventory.capacity)conflicts.push({placement:inventory.placement,capacity:inventory.capacity,peak});}return{inventories,recovery,conflicts};}
  static async updateCapacity(placement:AdvertisingPlacement,capacity:number){const admin=await requireAdminContext("platform:manage_billing");if(!Number.isInteger(capacity)||capacity<1||capacity>4)throw new Error("Capacity must be between 1 and 4 visible positions.");return this.runSerializable(async tx=>{await this.lock(tx,placement);const current=await tx.advertisingPlacementInventory.findUnique({where:{placement}});if(!current)throw new Error("Placement configuration was not found.");await this.assertCapacitySupportsCommitments(tx,placement,capacity);const saved=await tx.advertisingPlacementInventory.update({where:{placement},data:{capacity}});await tx.auditLog.create({data:{userId:admin.userId,action:"PROMOTION_CAPACITY_UPDATED",entity:"AdvertisingPlacementInventory",entityId:saved.id,oldValues:{capacity:current.capacity},newValues:{capacity}}});return saved;});}
}
