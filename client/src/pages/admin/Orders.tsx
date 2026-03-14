import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrders, useUpdateOrderStatus, useOrder } from "@/hooks/use-orders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Eye, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n";

const STATUSES = ["All", "Pending", "OnTheWay", "Delivered", "Cancelled"] as const;
type StatusFilter = typeof STATUSES[number];

export default function Orders() {
  const { data: orders, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const { data: orderDetails } = useOrder(selectedOrderId || 0);
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [dateFilter, setDateFilter] = useState("");

  const statuses = ["Pending", "OnTheWay", "Delivered", "Cancelled"];

  const handleViewDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowDetails(true);
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast({ title: `${t.profile.orderNumber} #${id} ${t.admin.orderMarkedAs} ${status}` });
    } catch (err: any) {
      toast({ title: t.admin.failedToUpdate, description: err.message, variant: "destructive" });
    }
  };

  // Counts per status for tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: orders?.length || 0 };
    statuses.forEach(s => {
      counts[s] = orders?.filter(o => o.status === s).length || 0;
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders?.filter(o => {
      // Status tab filter
      if (statusFilter !== "All" && o.status !== statusFilter) return false;

      // Date filter
      if (dateFilter) {
        const orderDate = o.createdAt ? format(new Date(o.createdAt), "yyyy-MM-dd") : "";
        if (!orderDate.includes(dateFilter)) return false;
      }

      // Text search
      const q = search.toLowerCase().replace(/^#/, "").trim();
      if (!q) return true;

      const isNumericQuery = /^\d+$/.test(q);
      const orderNumPadded = o.id.toString().padStart(6, "0");
      const orderIdRaw = o.id.toString();

      if (isNumericQuery) {
        // Numeric query: match order number (exact leading-zero or raw), or full phone match
        const matchesOrderNum = orderNumPadded === q.padStart(6, "0") || orderIdRaw === q;
        const matchesPhone = q.length >= 5 && (o.phone || "").startsWith(q);
        return matchesOrderNum || matchesPhone;
      }

      // Text query: match name or city
      return (
        (o.fullName || "").toLowerCase().includes(q) ||
        (o.city || "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter, dateFilter]);

  const getStatusBadge = (status: string) => {
    const cls = status === "Delivered" ? "bg-green-100 text-green-800" :
      status === "Cancelled" ? "bg-red-100 text-red-800" :
      status === "OnTheWay" ? "bg-blue-100 text-blue-800" :
      "bg-primary/10 text-primary";
    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
        {(t.orderStatus as any)?.[status] || status}
      </span>
    );
  };

  const statusTabColor = (s: StatusFilter) => {
    if (s === "Delivered") return statusFilter === s ? "bg-green-600 text-white border-green-600" : "border-border text-muted-foreground hover:border-green-400 hover:text-green-700";
    if (s === "Cancelled") return statusFilter === s ? "bg-red-600 text-white border-red-600" : "border-border text-muted-foreground hover:border-red-400 hover:text-red-700";
    if (s === "OnTheWay") return statusFilter === s ? "bg-blue-600 text-white border-blue-600" : "border-border text-muted-foreground hover:border-blue-400 hover:text-blue-700";
    if (s === "Pending") return statusFilter === s ? "bg-amber-500 text-white border-amber-500" : "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600";
    return statusFilter === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground";
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground" data-testid="text-orders-title">{t.admin.orders}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.admin.manageOrders}</p>
        </div>
      </div>

      {/* Status tabs with counts */}
      <div className="flex flex-wrap gap-2 mb-5">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all rounded-full ${statusTabColor(s)}`}
            data-testid={`filter-status-${s}`}
          >
            {s === "All" ? (t.admin.allOrders || "الكل") : (t.orderStatus as any)?.[s] || s}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusFilter === s ? "bg-white/20" : "bg-secondary"}`}>
              {statusCounts[s] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Date filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.admin.searchOrders}
            className="border border-border bg-background ps-9 pe-8 py-2 text-sm rounded-none outline-none focus:border-primary transition-colors w-full"
            data-testid="input-admin-search-orders"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="border border-border bg-background px-3 py-2 text-sm rounded-none outline-none focus:border-primary transition-colors"
            data-testid="input-admin-date-filter"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter("")} className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>{t.admin.orderId}</TableHead>
              <TableHead>{t.admin.date}</TableHead>
              <TableHead>{t.admin.customer}</TableHead>
              <TableHead>{t.admin.amount}</TableHead>
              <TableHead>{t.admin.status}</TableHead>
              <TableHead>{t.admin.action}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-8"><div className="flex justify-center"><div className="w-7 h-7 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div></TableCell></TableRow>
            ) : filteredOrders?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">{t.admin.noOrders || "لا توجد طلبات"}</TableCell></TableRow>
            ) : filteredOrders?.map((o) => (
              <TableRow key={o.id} data-testid={`row-order-${o.id}`}>
                <TableCell className="font-mono font-medium text-sm">#{o.id.toString().padStart(6, "0")}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="block text-sm">{o.createdAt ? format(new Date(o.createdAt), "dd MMM yyyy") : "—"}</span>
                  <span className="block text-xs text-muted-foreground">{o.createdAt ? format(new Date(o.createdAt), "HH:mm") : ""}</span>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{o.fullName}</p>
                  <p className="text-xs text-muted-foreground">{o.city}</p>
                </TableCell>
                <TableCell className="font-semibold">₪{parseFloat(o.totalAmount).toFixed(2)}</TableCell>
                <TableCell>{getStatusBadge(o.status)}</TableCell>
                <TableCell>
                  <select
                    value={o.status}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    disabled={updateStatus.isPending}
                    className="text-xs border border-border bg-background px-2 py-1 rounded-none outline-none focus:border-primary"
                    data-testid={`select-order-status-${o.id}`}
                  >
                    {statuses.map(s => <option key={s} value={s}>{(t.orderStatus as any)?.[s] || s}</option>)}
                  </select>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleViewDetails(o.id)} data-testid={`button-view-order-${o.id}`}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="py-8 flex justify-center"><div className="w-7 h-7 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
        ) : filteredOrders?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t.admin.noOrders || "لا توجد طلبات"}</div>
        ) : filteredOrders?.map((o) => (
          <div key={o.id} className="bg-card border border-border p-4 space-y-3" data-testid={`card-order-${o.id}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono font-semibold text-sm">#{o.id.toString().padStart(6, "0")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {o.createdAt ? `${format(new Date(o.createdAt), "dd MMM yyyy")} ${format(new Date(o.createdAt), "HH:mm")}` : "—"}
                </p>
              </div>
              {getStatusBadge(o.status)}
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{o.fullName}</p>
                <p className="text-xs text-muted-foreground">{o.city}</p>
              </div>
              <p className="font-bold text-base">₪{parseFloat(o.totalAmount).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <select
                value={o.status}
                onChange={(e) => handleStatusChange(o.id, e.target.value)}
                disabled={updateStatus.isPending}
                className="text-xs border border-border bg-background px-2 py-1.5 rounded-none outline-none focus:border-primary flex-1"
                data-testid={`select-order-status-mobile-${o.id}`}
              >
                {statuses.map(s => <option key={s} value={s}>{(t.orderStatus as any)?.[s] || s}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={() => handleViewDetails(o.id)} className="rounded-none text-xs h-7" data-testid={`button-view-order-mobile-${o.id}`}>
                <Eye className="w-3 h-3 me-1" /> {t.admin.action}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Order detail dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl sm:text-2xl font-mono">
              {t.profile.orderNumber} #{selectedOrderId?.toString().padStart(6, "0")}
            </DialogTitle>
          </DialogHeader>
          {orderDetails && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t.admin.customerName}</p>
                  <p className="font-medium">{orderDetails.order.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.admin.phoneLabel}</p>
                  <p className="font-medium">{orderDetails.order.phone}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">{t.admin.deliveryAddress}</p>
                  <p className="font-medium">{orderDetails.order.address}, {orderDetails.order.city}</p>
                </div>
                {orderDetails.order.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">{t.admin.notesLabel}</p>
                    <p className="font-medium">{orderDetails.order.notes}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">{t.admin.items}</h3>
                <div className="space-y-2">
                  {orderDetails.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm border-b border-border pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                      <div className="flex items-start gap-3">
                        {item.product?.mainImage && (
                          <img src={item.product.mainImage} alt="" className="w-10 h-12 object-cover bg-secondary flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium">
                            {item.product?.name}
                            {item.product?.id && (
                              <span className="ms-2 font-mono text-[10px] text-muted-foreground">#{String(item.product.id).padStart(4, "0")}</span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{t.admin.qty}: {item.quantity}</span>
                            {item.size && (
                              <span className="text-xs bg-secondary px-1.5 py-0.5 font-medium">{t.product.size}: {item.size}</span>
                            )}
                            {item.color && (
                              <span className="text-xs bg-secondary px-1.5 py-0.5 font-medium">{t.product.color}: {item.color}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="font-medium flex-shrink-0">₪{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between">
                <p className="font-semibold">{t.admin.totalLabel}:</p>
                <p className="text-lg font-bold">₪{parseFloat(orderDetails.order.totalAmount).toFixed(2)}</p>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium">{t.admin.changeStatus}</label>
                <select
                  value={orderDetails.order.status}
                  onChange={(e) => handleStatusChange(orderDetails.order.id, e.target.value)}
                  className="w-full mt-2 border border-border bg-background px-3 py-2 rounded-none text-sm"
                  data-testid="select-order-status-detail"
                >
                  {statuses.map(s => <option key={s} value={s}>{(t.orderStatus as any)?.[s] || s}</option>)}
                </select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
