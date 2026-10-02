import { describe, expect, it } from "vitest";
import { noWorkspaces, workspaceAccessReducer } from "@/lib/auth/workspace-access-state";

describe("workspace access hydration state", () => {
  it("keeps privileges hidden while an authenticated identity waits for backend session sync", () => {
    const waiting = workspaceAccessReducer({ ...noWorkspaces, loading: false, identity: null, revision: 0 }, { type: "clear", identity: "vendor", revision: 1, loading: true });
    expect(waiting).toMatchObject({ ...noWorkspaces, loading: true, identity: "vendor" });
  });
  it("replaces the early empty projection once the post-sync server projection resolves", () => {
    const ready = workspaceAccessReducer({ ...noWorkspaces, loading: true, identity: "admin", revision: 1 }, { type: "resolved", identity: "admin", revision: 2, access: { canAccessAdmin: true, canAccessVendor: false } });
    expect(ready).toMatchObject({ canAccessAdmin: true, canAccessVendor: false, loading: false });
  });
  it("clears privileged state for logout and identity changes before another projection can render", () => {
    const admin = { canAccessAdmin: true, canAccessVendor: false, loading: false, identity: "admin", revision: 2 };
    const switched = workspaceAccessReducer(admin, { type: "clear", identity: "customer", revision: 3, loading: true });
    const signedOut = workspaceAccessReducer(switched, { type: "clear", identity: null, revision: 4, loading: false });
    expect(switched).toMatchObject({ ...noWorkspaces, identity: "customer", loading: true });
    expect(signedOut).toMatchObject({ ...noWorkspaces, identity: null, loading: false });
  });
});
