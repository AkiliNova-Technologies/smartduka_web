"use client";

import * as React from "react";
import {
  Search,
  Users,
  Shield,
  User,
  Store,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import Image from "next/image";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { updateUserRoleAction, updateUserStatusAction } from "@/actions/admin";
import { PlatformRole, UserStatus } from "@prisma/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  platformRole: PlatformRole | null;
  vendorRole: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | string | null;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  SUPER_ADMIN: { label: "Super Admin", color: "text-amber-600 bg-amber-500/5 border-amber-500/10", icon: Shield },
  ADMIN: { label: "Admin", color: "text-purple-600 bg-purple-500/5 border-purple-500/10", icon: Shield },
  VENDOR: { label: "Vendor", color: "text-blue-600 bg-blue-500/5 border-blue-500/10", icon: Store },
  CUSTOMER: { label: "Customer", color: "text-emerald-600 bg-emerald-500/5 border-emerald-500/10", icon: User },
  SUPPORT: { label: "Support", color: "text-cyan-600 bg-cyan-500/5 border-cyan-500/10", icon: User },
  BILLING: { label: "Billing", color: "text-orange-600 bg-orange-500/5 border-orange-500/10", icon: User },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE: { label: "Active", color: "text-emerald-600 bg-emerald-500/5 border-emerald-500/10", icon: CheckCircle2 },
  PENDING: { label: "Pending", color: "text-amber-600 bg-amber-500/5 border-amber-500/10", icon: Clock },
  SUSPENDED: { label: "Suspended", color: "text-rose-600 bg-rose-500/5 border-rose-500/10", icon: XCircle },
  DEACTIVATED: { label: "Deactivated", color: "text-zinc-500 bg-zinc-500/5 border-zinc-500/10", icon: XCircle },
};

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function UsersSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-40 rounded-md" />
        <Skeleton className="h-3 w-64 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

export default function AdminUsersPage() {
  const { users, usersLoading, refreshUsers, metrics, metricsLoading } = useAdmin();
  const { userRole } = useAuth();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<PlatformRole | "ALL">("ALL");
  const [selectedUser, setSelectedUser] = React.useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const filteredUsers = React.useMemo(() => {
    let result = users;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.includes(q)
      );
    }
    if (roleFilter !== "ALL") {
      result = result.filter((u) => u.platformRole === roleFilter);
    }
    return result;
  }, [users, searchQuery, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: PlatformRole) => {
    setActionLoading(userId);
    try {
      const result = await updateUserRoleAction(userId, newRole);
      if (result.success) {
        toast.success(`Role updated to ${ROLE_CONFIG[newRole]?.label || newRole}`);
        refreshUsers();
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch {
      toast.error("Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    setActionLoading(userId);
    try {
      const result = await updateUserStatusAction(userId, newStatus);
      if (result.success) {
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        refreshUsers();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const columns = React.useMemo<ColumnDef<AdminUser, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="relative size-9 rounded-full overflow-hidden bg-muted border border-border/40 shrink-0">
              {row.original.avatarUrl ? (
                <Image src={row.original.avatarUrl} alt={row.original.name || ""} fill sizes="36px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="text-xs font-bold text-primary uppercase">{row.original.name?.charAt(0) || "?"}</span>
                </div>
              )}
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{row.original.name || "Unnamed"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "platformRole",
        header: "Role",
        cell: ({ row }) => {
          const config = ROLE_CONFIG[row.original.platformRole || ""] || ROLE_CONFIG.CUSTOMER;
          const Icon = config.icon;
          return (
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border", config.color)}>
              <Icon className="w-3 h-3" />{config.label}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const config = STATUS_CONFIG[row.original.status] || STATUS_CONFIG.ACTIVE;
          const Icon = config.icon;
          return (
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border", config.color)}>
              <Icon className="w-3 h-3" />{config.label}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const isLoading = actionLoading === row.original.id;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => setSelectedUser(row.original)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-border/40 hover:bg-muted transition-colors cursor-pointer"
                title="View details">
                <Search className="w-3.5 h-3.5" />
              </button>
              {isSuperAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isLoading} className="size-7 border border-border/40 rounded-lg text-muted-foreground cursor-pointer">
                      <MoreVertical className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl border border-border/60 p-1 text-xs font-medium">
                    <DropdownMenuItem disabled className="rounded-lg py-2 px-2.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Change Role</DropdownMenuItem>
                    {(Object.keys(ROLE_CONFIG) as PlatformRole[]).map((role) => (
                      <DropdownMenuItem key={role} onClick={() => handleRoleChange(row.original.id, role)} disabled={row.original.platformRole === role} className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer">
                        {React.createElement(ROLE_CONFIG[role].icon, { className: "size-3.5" })}{ROLE_CONFIG[role].label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="bg-border/40 my-1" />
                    <DropdownMenuItem disabled className="rounded-lg py-2 px-2.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Change Status</DropdownMenuItem>
                    {(Object.keys(STATUS_CONFIG) as UserStatus[]).map((status) => (
                      <DropdownMenuItem key={status} onClick={() => handleStatusChange(row.original.id, status)} disabled={row.original.status === status} className="rounded-lg py-2 px-2.5 text-xs flex items-center gap-2 cursor-pointer">
                        {React.createElement(STATUS_CONFIG[status].icon, { className: "size-3.5" })}{STATUS_CONFIG[status].label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        },
      },
    ],
    [isSuperAdmin, actionLoading, refreshUsers]
  );

  if (usersLoading && users.length === 0) return <UsersSkeleton />;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1 select-none">
        <h2 className="text-xl font-medium tracking-tight text-foreground flex items-center gap-2">
          <Users className="w-5 h-5" />Platform Users
        </h2>
        <p className="text-xs font-semibold text-muted-foreground">
          Manage all registered users, assign roles, and control account statuses.
          {!isSuperAdmin && " Role changes require Super Admin privileges."}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 select-none">
        {[
          { label: "Total Users", value: metrics?.totalUsers ?? 0, icon: Users, color: "text-blue-600" },
          { label: "Customers", value: metrics?.totalCustomers ?? 0, icon: User, color: "text-emerald-600" },
          { label: "Vendors", value: metrics?.totalVendors ?? 0, icon: Store, color: "text-purple-600" },
          { label: "Admins", value: metrics?.totalAdmins ?? 0, icon: Shield, color: "text-amber-600" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-card border border-border/60 rounded-2xl p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={cn("w-4 h-4", kpi.color)} />
            </div>
            <p className="text-2xl font-semibold text-foreground tracking-tight">{metricsLoading ? "—" : kpi.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        getRowId={(row) => row.id}
        isLoading={usersLoading}
        renderTabs={
          <div className="flex items-center gap-3">
            <div className="relative w-full max-w-xs group">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 border-border/60 rounded-full bg-muted/20 placeholder:text-muted-foreground/40 text-xs focus-visible:ring-primary/20"
              />
            </div>
            <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as PlatformRole | "ALL")}>
              <SelectTrigger className="h-9 w-36 rounded-full text-xs border-border/60">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectGroup>
                  <SelectItem value="ALL" className="text-xs">All Roles</SelectItem>
                  {(Object.keys(ROLE_CONFIG) as PlatformRole[]).map((role) => (
                    <SelectItem key={role} value={role} className="text-xs">{ROLE_CONFIG[role].label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        {selectedUser && (
          <SheetContent side="right" className="w-full sm:max-w-md bg-card border-l border-border/60 p-6 overflow-y-auto">
            <SheetHeader className="text-left px-0">
              <SheetTitle className="text-base font-medium flex items-center gap-2">
                <div className="relative size-8 rounded-full overflow-hidden bg-muted border border-border/40">
                  {selectedUser.avatarUrl ? (
                    <Image src={selectedUser.avatarUrl} alt="" fill className="object-cover" sizes="32px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <span className="text-xs font-bold text-primary uppercase">{selectedUser.name?.charAt(0) || "?"}</span>
                    </div>
                  )}
                </div>
                {selectedUser.name || "Unnamed"}
              </SheetTitle>
              <SheetDescription className="text-xs font-mono text-muted-foreground">ID: {selectedUser.id}</SheetDescription>
            </SheetHeader>
            <div className="space-y-5 mt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="w-3.5 h-3.5" />{selectedUser.email}</div>
                {selectedUser.phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="w-3.5 h-3.5" />{selectedUser.phone}</div>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="w-3.5 h-3.5" />Joined {formatDate(selectedUser.createdAt)}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" />Last login: {formatDate(selectedUser.lastLoginAt)}</div>
              </div>
              <div className="border-t border-border/40 pt-4 space-y-2">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role</h4>
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border", ROLE_CONFIG[selectedUser.platformRole || ""]?.color || ROLE_CONFIG.CUSTOMER.color)}>
                  {ROLE_CONFIG[selectedUser.platformRole || ""]?.label || "Customer"}
                </span>
              </div>
              <div className="border-t border-border/40 pt-4 space-y-2">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</h4>
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border", STATUS_CONFIG[selectedUser.status]?.color || STATUS_CONFIG.ACTIVE.color)}>
                  {STATUS_CONFIG[selectedUser.status]?.label || "Active"}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-border/40 pt-4 mt-6">
              <Button variant="secondary" onClick={() => setSelectedUser(null)} className="w-full h-10 rounded-xl text-xs font-medium border cursor-pointer">Close</Button>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}