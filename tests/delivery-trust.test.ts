import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({find:vi.fn(),update:vi.fn(),audit:vi.fn(),admin:vi.fn()}));
vi.mock("@/lib/prisma/client",()=>({prisma:{subOrder:{findFirst:mocks.find,update:mocks.update},auditLog:{create:mocks.audit}}}));
vi.mock("@/lib/auth/admin-context",()=>({requireAdminContext:mocks.admin}));
import { DeliveryTrustService } from "@/services/delivery-trust";
const delivered={id:"s",status:"DELIVERED",deliveryConfirmedAt:null};
beforeEach(()=>{vi.clearAllMocks();mocks.find.mockResolvedValue(delivered);mocks.update.mockImplementation(async({data}:{data:object})=>({...delivered,...data}));mocks.admin.mockResolvedValue({userId:"admin"});});
describe("delivery trust authority",()=>{
 it("lets a customer confirm only their own delivered suborder with server-owned source",async()=>{await DeliveryTrustService.confirmCustomerReceipt("s","customer-a");expect(mocks.find).toHaveBeenCalledWith({where:{id:"s",status:"DELIVERED",order:{is:{customerId:"customer-a"}}}});expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({deliveryConfirmationSource:"CUSTOMER",deliveryConfirmedByUserId:"customer-a",deliveryConfirmedAt:expect.any(Date)})}));});
 it("rejects another customer or non-delivered suborder",async()=>{mocks.find.mockResolvedValueOnce(null);await expect(DeliveryTrustService.confirmCustomerReceipt("s","customer-b")).rejects.toThrow("not found");});
 it("is idempotent and preserves the original confirmation timestamp",async()=>{const at=new Date("2026-09-01T00:00:00Z");mocks.find.mockResolvedValue({...delivered,deliveryConfirmedAt:at,deliveryConfirmationSource:"CUSTOMER"});const result=await DeliveryTrustService.confirmCustomerReceipt("s","customer-a");expect(result.deliveryConfirmedAt).toBe(at);expect(mocks.update).not.toHaveBeenCalled();});
 it("requires platform admin context and persists PLATFORM_ADMIN source",async()=>{await DeliveryTrustService.confirmDeliveryForCurrentAdmin("s");expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({deliveryConfirmationSource:"PLATFORM_ADMIN",deliveryConfirmedByUserId:"admin"})}));mocks.admin.mockRejectedValue(new Error("denied"));await expect(DeliveryTrustService.confirmDeliveryForCurrentAdmin("s")).rejects.toThrow("denied");});
});
