import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { useOrders, useOrder } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, User, LogOut, ExternalLink, Clock, Truck, PackageCheck, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/i18n";

export default function Profile() {
  const { data: user, isLoading } = useAuth();
  const { data: orders } = useOrders();
  const logout = useLogout();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const { data: orderDetails } = useOrder(selectedOrderId || 0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading || !user) return null;

  const handleLogout = async () => {
    await logout.mutateAsync();
    setLocation("/");
  };

  const statusConfig: Record<string, { icon: any; bg: string; border: string; text: string; dot: string }> = {
    Pending:   { icon: Clock,        bg: "bg-amber-50",  border: "border-amber-300", text: "text-amber-700",  dot: "bg-amber-400"  },
    OnTheWay:  { icon: Truck,        bg: "bg-blue-50",   border: "border-blue-300",  text: "text-blue-700",   dot: "bg-blue-500"   },
    Delivered: { icon: PackageCheck, bg: "bg-green-50",  border: "border-green-300", text: "text-green-700",  dot: "bg-green-500"  },
    Cancelled: { icon: XCircle,      bg: "bg-red-50",    border: "border-red-300",   text: "text-red-600",    dot: "bg-red-400"    },
  };

  const getStatusBadge = (status: string) => {
    const cfg = statusConfig[status] || statusConfig.Pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-full ${cfg.bg} ${cfg.border} ${cfg.text}`}>
        <Icon className="w-3.5 h-3.5" />
        {(t.orderStatus as any)?.[status] || status}
      </span>
    );
  };

  const PROGRESS_STEPS = ["Pending", "OnTheWay", "Delivered"] as const;
  const getProgressTracker = (status: string) => {
    if (status === "Cancelled") {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">{(t.orderStatus as any)?.["Cancelled"] || "Cancelled"}</p>
            <p className="text-xs text-red-500 mt-0.5">{"تم إلغاء هذا الطلب"}</p>
          </div>
        </div>
      );
    }
    const currentIdx = PROGRESS_STEPS.indexOf(status as any);
    return (
      <div className="relative flex items-center justify-between px-2">
        {PROGRESS_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          const cfg = statusConfig[step];
          const Icon = cfg.icon;
          return (
            <div key={step} className="flex-1 flex flex-col items-center relative">
              {i < PROGRESS_STEPS.length - 1 && (
                <div className={`absolute top-4 start-1/2 w-full h-0.5 transition-colors ${i < currentIdx ? "bg-green-400" : "bg-border"}`} />
              )}
              <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                active ? `${cfg.dot} border-transparent shadow-md scale-110` :
                done   ? "bg-green-500 border-transparent" :
                         "bg-background border-border"
              }`}>
                <Icon className={`w-3.5 h-3.5 ${done || active ? "text-white" : "text-muted-foreground"}`} />
              </div>
              <p className={`mt-2 text-[10px] font-semibold text-center leading-tight ${active ? cfg.text : done ? "text-green-600" : "text-muted-foreground"}`}>
                {(t.orderStatus as any)?.[step] || step}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col pt-20">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-baseline mb-8 sm:mb-12 border-b border-border pb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold" data-testid="text-profile-title">{t.profile.myAccount}</h1>
          <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-destructive" data-testid="button-profile-logout">
            <LogOut className="w-4 h-4 me-2" /> {t.profile.logout}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-1 space-y-8">
            <div className="bg-secondary p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-display text-xl">
                  {user.fullName ? user.fullName[0].toUpperCase() : <User />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg" data-testid="text-user-name">{user.fullName || "User"}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="border-t border-border pt-4 text-sm text-muted-foreground space-y-2">
                <p><strong>{t.profile.role}:</strong> <span className="capitalize">{user.role}</span></p>
                {user.role === 'admin' && (
                  <Link href="/admin">
                    <Button variant="outline" className="w-full mt-4 rounded-none uppercase tracking-widest text-xs" data-testid="link-admin-dashboard">{t.nav.adminDashboard}</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-10">
            <div>
              <h2 className="text-xl font-semibold uppercase tracking-widest mb-6 flex items-center" data-testid="text-order-history">
                <Package className="w-5 h-5 me-3" /> {t.profile.orderHistory}
              </h2>
              
              {!orders || orders.length === 0 ? (
                <div className="border border-border p-8 text-center bg-card">
                  <p className="text-muted-foreground mb-4">{t.profile.noOrders}</p>
                  <Link href="/shop">
                    <Button variant="outline" className="rounded-none uppercase tracking-widest text-sm" data-testid="button-start-shopping">{t.profile.startShopping}</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="border border-border p-6 bg-card hover:border-primary/50 transition-colors" data-testid={`card-order-${order.id}`}>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 border-b border-border pb-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{t.profile.orderNumber} #{order.id.toString().padStart(6, '0')}</p>
                          <p className="font-medium">{order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy') : 'N/A'}</p>
                        </div>
                        <div className="mt-2 sm:mt-0 flex flex-col sm:items-end gap-2">
                          {getStatusBadge(order.status)}
                          <p className="font-bold text-lg">₪{parseFloat(order.totalAmount).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{t.profile.payment}: {order.paymentMethod}</span>
                        <Button variant="ghost" size="sm" className="uppercase tracking-widest text-xs h-8" onClick={() => { setSelectedOrderId(order.id); setShowDetails(true); }} data-testid={`button-view-details-${order.id}`}>
                          {t.profile.viewDetails} <ExternalLink className="w-3 h-3 ms-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg rounded-none">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{t.profile.orderNumber} #{selectedOrderId?.toString().padStart(6, '0')}</DialogTitle>
          </DialogHeader>
          {orderDetails && (
            <div className="space-y-5 mt-4">
              <div className="flex justify-between items-center">
                {getStatusBadge(orderDetails.order.status)}
                <span className="text-sm text-muted-foreground">
                  {orderDetails.order.createdAt ? format(new Date(orderDetails.order.createdAt), 'MMM dd, yyyy') : ''}
                </span>
              </div>

              <div className="pt-1 pb-2">
                {getProgressTracker(orderDetails.order.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t.checkout.fullName}</p>
                  <p className="font-medium">{orderDetails.order.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.checkout.phone}</p>
                  <p className="font-medium">{orderDetails.order.phone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">{t.checkout.address}</p>
                  <p className="font-medium">{orderDetails.order.address}, {orderDetails.order.city}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-widest">{t.profile.items}</h3>
                <div className="space-y-3">
                  {orderDetails.items.map(item => (
                    <div key={item.id} className="flex gap-3 text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                      {item.product?.mainImage && (
                        <img src={item.product.mainImage} alt="" className="w-12 h-16 object-cover bg-secondary flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product?.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{t.profile.qty}: {item.quantity}</span>
                          {item.size && (
                            <span className="text-xs bg-secondary px-1.5 py-0.5 font-medium">{t.product.size}: {item.size}</span>
                          )}
                          {item.color && (
                            <span className="text-xs bg-secondary px-1.5 py-0.5 font-medium">{t.product.color}: {item.color}</span>
                          )}
                        </div>
                      </div>
                      <p className="font-medium flex-shrink-0">₪{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between items-center">
                <p className="font-semibold">{t.checkout.total}</p>
                <p className="text-lg font-bold" data-testid="text-order-detail-total">₪{parseFloat(orderDetails.order.totalAmount).toFixed(2)}</p>
              </div>

              <div className="text-sm text-muted-foreground">
                {t.profile.payment}: {orderDetails.order.paymentMethod}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
