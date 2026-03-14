import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminStats } from "@/hooks/use-stats";
import { Package, Users, ShoppingCart, DollarSign, AlertCircle } from "lucide-react";
import { useLanguage } from "@/i18n";

export default function Dashboard() {
  const { data: stats, isLoading } = useAdminStats();
  const { t } = useLanguage();

  if (isLoading) return <AdminLayout><div className="animate-pulse h-full bg-card rounded-xl"></div></AdminLayout>;

  const cards = [
    { title: t.admin.totalRevenue, value: `₪${stats?.totalSales?.toFixed(2) || '0.00'}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
    { title: t.admin.totalOrders, value: stats?.totalOrders || 0, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-100" },
    { title: t.admin.productsCount, value: stats?.totalProducts || 0, icon: Package, color: "text-purple-600", bg: "bg-purple-100" },
    { title: t.admin.customers, value: stats?.totalUsers || 0, icon: Users, color: "text-orange-600", bg: "bg-orange-100" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-semibold text-foreground" data-testid="text-dashboard-title">{t.admin.dashboardOverview}</h1>
        <p className="text-muted-foreground mt-1">{t.admin.welcomeAdmin}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, i) => (
          <div key={i} className="bg-card border border-border p-6 shadow-sm hover:shadow-md transition-shadow" data-testid={`card-stat-${i}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">{card.title}</p>
                <h3 className="text-3xl font-semibold text-foreground">{card.value}</h3>
              </div>
              <div className={`p-3 rounded-full ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {stats?.lowStockCount ? (
        <div className="bg-destructive/10 border border-destructive/20 p-6 flex items-start gap-4" data-testid="alert-low-stock">
          <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-destructive mb-1">{t.admin.lowStockAlert}</h3>
            <p className="text-destructive/80 text-sm">{stats.lowStockCount} {t.admin.lowStockDesc}</p>
          </div>
        </div>
      ) : null}
      
      <div className="mt-8 bg-card border border-border p-8 text-center text-muted-foreground min-h-[300px] flex items-center justify-center flex-col">
         <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
         <p>{t.admin.recentActivity}</p>
      </div>
    </AdminLayout>
  );
}
