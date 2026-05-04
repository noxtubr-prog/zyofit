import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Package, ShieldCheck, TrendingUp, ArrowRight, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import StoresDebugPanel from "@/components/admin/StoresDebugPanel";
import { getStoreCounts, listStores, liveStoreQueryOptions } from "@/lib/stores";
import useStoresRealtime from "@/hooks/useStoresRealtime";

const AdminDashboard = () => {
  useStoresRealtime();

  const { data: userCount = 0 } = useQuery({
    queryKey: ["admin-user-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: storeCounts = { total: 0, pending: 0, approved: 0 } } = useQuery({
    queryKey: ["stores", "counts", "admin-dashboard"],
    queryFn: getStoreCounts,
    ...liveStoreQueryOptions,
  });

  const { data: orderCount = 0 } = useQuery({
    queryKey: ["admin-order-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: totalRevenue = 0 } = useQuery({
    queryKey: ["admin-total-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total_amount");
      if (error) throw error;
      return data?.reduce((sum, o) => sum + Number(o.total_amount), 0) ?? 0;
    },
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, tailor_name, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingStores = [] } = useQuery({
    queryKey: ["stores", "pending-preview"],
    queryFn: async () => {
      const data = await listStores({ status: "pending", limit: 5 });
      console.log("[stores] dashboard pending preview", data);
      return data;
    },
    ...liveStoreQueryOptions,
  });

  const stats = [
    { label: "Total Users", value: userCount, icon: Users },
    { label: "Total Stores", value: storeCounts.total, icon: ShieldCheck },
    { label: "Total Orders", value: orderCount, icon: Package },
    { label: "Pending Approvals", value: storeCounts.pending, icon: TrendingUp },
    { label: "Total Revenue", value: `₹${Number(totalRevenue).toLocaleString("en-IN")}`, icon: IndianRupee, isText: true },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card rounded-2xl p-5 card-shadow">
              <Icon className="h-6 w-6 text-accent mb-2" />
              <p className="text-2xl font-bold text-foreground">{"isText" in stat ? stat.value : stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-8">
        <StoresDebugPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Pending Approvals</h2>
            <Link to="/admin/tailors">
              <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
          {pendingStores.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 card-shadow text-center text-muted-foreground">
              No pending approvals
            </div>
          ) : (
            <div className="space-y-3">
              {pendingStores.map((t: any) => (
                <div key={t.id} className="bg-card rounded-2xl p-4 card-shadow flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{t.shop_name}</p>
                    <p className="text-xs text-muted-foreground">{t.location} • {format(new Date(t.created_at), "dd MMM")}</p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Recent Orders</h2>
            <Link to="/admin/orders">
              <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 card-shadow text-center text-muted-foreground">
              No orders yet
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="bg-card rounded-2xl p-4 card-shadow">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-foreground">{order.order_number}</span>
                    <Badge variant="secondary">{order.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.tailor_name || "—"} • ₹{Number(order.total_amount).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
