import { AsyncLocalStorage } from "node:async_hooks";
import { PlatformRole, VendorUserRole } from "@prisma/client";

export interface VendorSessionContext {
  userId: string;
  vendorId: string | null;
  platformRole: PlatformRole | null;
  vendorRole: VendorUserRole | null;
}

const vendorStorage = new AsyncLocalStorage<VendorSessionContext>();

export const VendorContext = {
  /**
   * Wraps an execution tree, binding the multi-tenant context to this specific execution thread.
   * Utilizes a Generic type <T> to remove 'any' and contextually infer the block's return type.
   */
  run<T>(context: VendorSessionContext, fn: () => T): T {
    return vendorStorage.run(context, fn);
  },

  /**
   * Asserts and fetches the active context structure.
   * Throws an explicit breakdown error if called outside an initialized execution loop.
   */
  requireStore(): VendorSessionContext {
    const store = vendorStorage.getStore();
    if (!store) {
      throw new Error("Context Isolation Failure: This operation must be executed within an authenticated session context.");
    }
    return store;
  },

  /**
   * Safely fetches the active vendor ID partition. Returns null if standard client view.
   */
  getVendorId(): string | null {
    return vendorStorage.getStore()?.vendorId ?? null;
  },

  /**
   * Fetches the current logged in user ID from active thread state.
   */
  getUserId(): string | null {
    return vendorStorage.getStore()?.userId ?? null;
  },

  /**
   * Fetches global platform-wide role authorization (e.g., SUPER_ADMIN, SUPPORT).
   */
  getPlatformRole(): PlatformRole | null {
    return vendorStorage.getStore()?.platformRole ?? null;
  },

  /**
   * Fetches the internal vendor shop hierarchy role (e.g., OWNER, MANAGER, STAFF).
   */
  getVendorRole(): VendorUserRole | null {
    return vendorStorage.getStore()?.vendorRole ?? null;
  }
};