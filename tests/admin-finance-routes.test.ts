import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ withdrawals: vi.fn(), withdrawal: vi.fn(), payments: vi.fn(), payment: vi.fn(), approve: vi.fn(), reject: vi.fn() }));
vi.mock("@/services/admin-finance", () => ({ AdminFinanceService: { listWithdrawals: mocks.withdrawals, getWithdrawal: mocks.withdrawal, listPayments: mocks.payments, getPayment: mocks.payment } }));
vi.mock("@/services/vendor-withdrawal", () => ({ VendorWithdrawalService: { approveWithdrawalForCurrentAdmin: mocks.approve, rejectWithdrawalForCurrentAdmin: mocks.reject } }));
import * as withdrawals from "@/app/api/admin/finance/withdrawals/route";
import * as withdrawalDetail from "@/app/api/admin/finance/withdrawals/[id]/route";
import * as payments from "@/app/api/admin/finance/payments/route";
import * as paymentDetail from "@/app/api/admin/finance/payments/[id]/route";
beforeEach(() => vi.clearAllMocks());
describe("Admin finance routes", () => {
  it("returns bounded server projections for finance queues", async () => { mocks.withdrawals.mockResolvedValue([]); mocks.payments.mockResolvedValue([]); expect((await withdrawals.GET()).status).toBe(200); expect((await payments.GET()).status).toBe(200); });
  it("reads a single authorized withdrawal or payment by route parameter", async () => { mocks.withdrawal.mockResolvedValue({ id: "payout" }); mocks.payment.mockResolvedValue({ id: "attempt" }); expect((await withdrawalDetail.GET(new Request("http://x") as never, { params: Promise.resolve({ id: "payout" }) })).status).toBe(200); expect((await paymentDetail.GET(new Request("http://x") as never, { params: Promise.resolve({ id: "attempt" }) })).status).toBe(200); expect(mocks.withdrawal).toHaveBeenCalledWith("payout"); expect(mocks.payment).toHaveBeenCalledWith("attempt"); });
  it("routes withdrawal approval and rejection only to the existing server service", async () => { mocks.approve.mockResolvedValue({ id: "payout", status: "APPROVED" }); mocks.reject.mockResolvedValue({ id: "payout", status: "REJECTED" }); const request=(action:string)=>new Request("http://x",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action})}); expect((await withdrawalDetail.PATCH(request("approve") as never,{params:Promise.resolve({id:"payout"})})).status).toBe(200); expect((await withdrawalDetail.PATCH(request("reject") as never,{params:Promise.resolve({id:"payout"})})).status).toBe(200); expect(mocks.approve).toHaveBeenCalledWith("payout"); expect(mocks.reject).toHaveBeenCalledWith("payout"); });
});
