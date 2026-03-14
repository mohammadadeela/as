import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Users, UserCheck, UserX, Shield, Search, Trash2,
  ShieldCheck, ShieldOff, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminUser = {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  isVerified: boolean | null;
  isBlocked: boolean | null;
  createdAt: string | null;
  orderCount: number;
};

function getInitials(name: string | null, email: string) {
  if (name && name.trim()) {
    return name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }
  return email[0].toUpperCase();
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminUsers() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | "active" | "blocked" | "admins">("all");

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminUser> }) =>
      apiRequest("PATCH", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || t.admin.failedToUpdate, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: t.admin.userDeleted });
    },
    onError: (err: any) => {
      toast({ title: err.message || t.admin.failedToUpdate, variant: "destructive" });
    },
  });

  const handleBlock = (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      toast({ title: t.admin.cannotBlockSelf, variant: "destructive" });
      return;
    }
    const newBlocked = !user.isBlocked;
    updateMutation.mutate(
      { id: user.id, data: { isBlocked: newBlocked } as any },
      {
        onSuccess: () => {
          toast({ title: newBlocked ? t.admin.userBlocked : t.admin.userUnblocked });
        },
      }
    );
  };

  const handleRoleChange = (user: AdminUser) => {
    const newRole = user.role === "admin" ? "customer" : "admin";
    updateMutation.mutate(
      { id: user.id, data: { role: newRole } as any },
      {
        onSuccess: () => {
          toast({ title: t.admin.roleChanged });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (id === currentUser?.id) {
      toast({ title: t.admin.cannotDeleteSelf, variant: "destructive" });
      return;
    }
    deleteMutation.mutate(id);
    setConfirmDelete(null);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (u.fullName && u.fullName.toLowerCase().includes(q)) || u.email.toLowerCase().includes(q);
    const matchesFilter =
      filterType === "all" ||
      (filterType === "active" && !u.isBlocked) ||
      (filterType === "blocked" && u.isBlocked) ||
      (filterType === "admins" && u.role === "admin");
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => !u.isBlocked).length,
    blocked: users.filter((u) => u.isBlocked).length,
    admins: users.filter((u) => u.role === "admin").length,
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-semibold text-foreground" data-testid="text-users-title">
          {t.admin.users}
        </h1>
        <p className="text-muted-foreground mt-1">{t.admin.manageUsers}</p>
      </div>

      {/* Stats — clickable filter cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {([
          { key: "all",     label: t.admin.totalUsers,   value: stats.total,   icon: Users,      color: "text-blue-600",   bg: "bg-blue-50",   ring: "ring-blue-400",   activeBorder: "border-blue-400"   },
          { key: "active",  label: t.admin.activeUsers,  value: stats.active,  icon: UserCheck,  color: "text-green-600",  bg: "bg-green-50",  ring: "ring-green-400",  activeBorder: "border-green-400"  },
          { key: "blocked", label: t.admin.blockedUsers, value: stats.blocked, icon: UserX,      color: "text-red-600",    bg: "bg-red-50",    ring: "ring-red-400",    activeBorder: "border-red-400"    },
          { key: "admins",  label: t.admin.adminUsers,   value: stats.admins,  icon: Shield,     color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-400", activeBorder: "border-purple-400" },
        ] as const).map((card) => {
          const isActive = filterType === card.key;
          return (
            <button
              key={card.key}
              onClick={() => setFilterType(isActive ? "all" : card.key)}
              className={`bg-card border p-5 text-start w-full transition-all cursor-pointer hover:shadow-md ${
                isActive ? `${card.activeBorder} ring-1 ${card.ring} shadow-sm` : "border-border hover:border-muted-foreground/40"
              }`}
              data-testid={`card-user-stat-${card.key}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{card.label}</p>
                  <p className={`text-3xl font-semibold ${isActive ? card.color : "text-foreground"}`}>{card.value}</p>
                </div>
                <div className={`p-3 rounded-full ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              {isActive && (
                <p className={`text-[10px] mt-2 font-semibold uppercase tracking-wider ${card.color}`}>
                  {t.admin.filterActive || "فلتر نشط ✓"}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t.admin.searchUsers}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-border bg-background ps-9 pe-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          data-testid="input-search-users"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="w-7 h-7 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">{t.admin.noUsersFound}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-xs tracking-wide">
                <th className="text-start px-4 py-3 font-medium">{t.admin.name}</th>
                <th className="text-start px-4 py-3 font-medium hidden md:table-cell">{t.admin.userEmail}</th>
                <th className="text-start px-4 py-3 font-medium hidden lg:table-cell">{t.admin.userPhone}</th>
                <th className="text-start px-4 py-3 font-medium">{t.admin.userRole}</th>
                <th className="text-start px-4 py-3 font-medium">{t.admin.userStatus}</th>
                <th className="text-start px-4 py-3 font-medium hidden md:table-cell">{t.admin.userOrders}</th>
                <th className="text-start px-4 py-3 font-medium hidden lg:table-cell">{t.admin.userJoined}</th>
                <th className="text-end px-4 py-3 font-medium">{t.admin.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isSelf = user.id === currentUser?.id;
                const initials = getInitials(user.fullName, user.email);
                const isBlocked = user.isBlocked ?? false;
                const isAdmin = user.role === "admin";

                return (
                  <tr
                    key={user.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${isBlocked ? "opacity-60" : ""}`}
                    data-testid={`row-user-${user.id}`}
                  >
                    {/* Avatar + Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                          isBlocked
                            ? "bg-red-100 text-red-600"
                            : isAdmin
                            ? "bg-purple-100 text-purple-700"
                            : "bg-primary/10 text-primary"
                        }`} data-testid={`avatar-user-${user.id}`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[130px]" data-testid={`text-name-${user.id}`}>
                            {user.fullName || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[130px] md:hidden">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell" data-testid={`text-email-${user.id}`}>
                      {user.email}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell" data-testid={`text-phone-${user.id}`}>
                      {user.phone || "—"}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3" data-testid={`text-role-${user.id}`}>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        isAdmin ? "bg-purple-100 text-purple-700" : "bg-secondary text-secondary-foreground"
                      }`}>
                        {isAdmin && <Shield className="w-3 h-3" />}
                        {isAdmin ? t.admin.adminRole : t.admin.customerRole}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3" data-testid={`text-status-${user.id}`}>
                      {isBlocked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          <UserX className="w-3 h-3" />
                          {t.admin.blocked}
                        </span>
                      ) : user.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          <UserCheck className="w-3 h-3" />
                          {t.admin.verified}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          {t.admin.unverified}
                        </span>
                      )}
                    </td>

                    {/* Order count */}
                    <td className="px-4 py-3 hidden md:table-cell" data-testid={`text-orders-${user.id}`}>
                      <span className="text-foreground font-medium">{user.orderCount}</span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs" data-testid={`text-joined-${user.id}`}>
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {/* Block / Unblock */}
                        {!isSelf && (
                          <button
                            onClick={() => handleBlock(user)}
                            disabled={updateMutation.isPending}
                            title={isBlocked ? t.admin.unblockUser : t.admin.blockUser}
                            className={`p-1.5 rounded transition-colors ${
                              isBlocked
                                ? "text-green-600 hover:bg-green-50"
                                : "text-orange-500 hover:bg-orange-50"
                            }`}
                            data-testid={`button-${isBlocked ? "unblock" : "block"}-${user.id}`}
                          >
                            {isBlocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                          </button>
                        )}

                        {/* Promote / Demote */}
                        {!isSelf && (
                          <button
                            onClick={() => handleRoleChange(user)}
                            disabled={updateMutation.isPending}
                            title={isAdmin ? t.admin.makeCustomer : t.admin.makeAdmin}
                            className={`p-1.5 rounded transition-colors ${
                              isAdmin
                                ? "text-muted-foreground hover:bg-muted"
                                : "text-purple-600 hover:bg-purple-50"
                            }`}
                            data-testid={`button-role-${user.id}`}
                          >
                            {isAdmin ? <ChevronDown className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          </button>
                        )}

                        {/* Delete */}
                        {!isSelf && (
                          confirmDelete === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(user.id)}
                                disabled={deleteMutation.isPending}
                                className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded hover:bg-destructive/90 transition-colors"
                                data-testid={`button-confirm-delete-${user.id}`}
                              >
                                {t.admin.deleteUser}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-xs text-muted-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                                data-testid={`button-cancel-delete-${user.id}`}
                              >
                                {t.admin.cancel}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(user.id)}
                              title={t.admin.deleteUser}
                              className="p-1.5 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                              data-testid={`button-delete-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}

                        {/* Self badge */}
                        {isSelf && (
                          <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded" data-testid={`badge-self-${user.id}`}>
                            You
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
