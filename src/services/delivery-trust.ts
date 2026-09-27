import { DeliveryConfirmationSource, SubOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { requireAdminContext } from "@/lib/auth/admin-context";
export class DeliveryTrustError extends Error {}
export class DeliveryTrustService {
 static async confirmCustomerReceipt(subOrderId:string, customerId:string) { return this.confirm(subOrderId,customerId,DeliveryConfirmationSource.CUSTOMER,{order:{is:{customerId}}}); }
 static async confirmDeliveryForCurrentAdmin(subOrderId:string) { const admin=await requireAdminContext("platform:customer_support"); return this.confirm(subOrderId,admin.userId,DeliveryConfirmationSource.PLATFORM_ADMIN,{}); }
 private static async confirm(subOrderId:string,userId:string,source:DeliveryConfirmationSource,ownership:object) { const sub=await prisma.subOrder.findFirst({where:{id:subOrderId,status:SubOrderStatus.DELIVERED,...ownership}}); if(!sub) throw new DeliveryTrustError("Delivered SubOrder was not found."); if(sub.deliveryConfirmedAt) return sub; const updated=await prisma.subOrder.update({where:{id:sub.id},data:{deliveryConfirmedAt:new Date(),deliveryConfirmedByUserId:userId,deliveryConfirmationSource:source}}); await prisma.auditLog.create({data:{userId,action:"DELIVERY_TRUST_CONFIRMED",entity:"SubOrder",entityId:sub.id,newValues:{source}}}); return updated; }
}
