export type WorkspaceAccess = { canAccessVendor: boolean; canAccessAdmin: boolean };
export type WorkspaceAccessState = WorkspaceAccess & { loading: boolean; identity: string | null; revision: number };
export const noWorkspaces: WorkspaceAccess = { canAccessVendor: false, canAccessAdmin: false };
export const initialWorkspaceAccessState: WorkspaceAccessState = { ...noWorkspaces, loading: false, identity: null, revision: 0 };
type Action = { type: "clear"; identity: string | null; revision: number; loading: boolean } | { type: "resolved"; identity: string; revision: number; access: WorkspaceAccess };
export function workspaceAccessReducer(_state: WorkspaceAccessState, action: Action): WorkspaceAccessState { if (action.type === "clear") return { ...noWorkspaces, identity: action.identity, revision: action.revision, loading: action.loading }; return { ...action.access, identity: action.identity, revision: action.revision, loading: false }; }
