import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package, TrendingUp, Wallet, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { getStoreByUserId, liveStoreQueryOptions } from "@/lib/stores";
import useStoresRealtime from "@/hooks/useStoresRealtime";
import MyStoreStatusBadge from "@/components/MyStoreStatusBadge";

const TailorDashboard = () => {
  const { user } = useAuth();
  useStoresRealtime();

  // Store status from stores table (single source of truth)
  const { data: store } = useQuery({
    queryKey: ["stores", "mine", user?.id],
    queryFn: () => getStoreByUserId(user!.id),
    enabled: !!user,
    ...liveStoreQueryOptions,
  });

  // Tailor profile for wallet/orders linkage
  const { data: tailorProfile } = useQuery({
    queryKey: ["tailor-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tailor_profiles")
        .select("id, shop_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["tailor-wallet", tailorProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tailor_wallets")
        .select("*")
        .eq("tailor_profile_id", tailorProfile!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tailorProfile?.id,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["tailor-orders-dashboard", tailorProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at, order_items(service_name)")
        .eq("tailor_profile_id", tailorProfile!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!tailorProfile?.id,
  });

  const { data: pendingWithdrawals = [] } = useQuery({
    queryKey: ["tailor-pending-withdrawals", wallet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("id")
        .eq("wallet_id", wallet!.id)
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
    enabled: !!wallet?.id,
  });

  const totalOrders = orders.length;

  if (!store) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <h1 className="text-3xl font-bold mb-4">Welcome to ZyloFit</h1>
        <p className="text-muted-foreground mb-6">Set up your store to start accepting orders.</p>
        <Link to="/tailor/store">
          <Button size="lg">Create Your Store <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
    );
  }

  const storeStatus = store.store_status;
  const shopName = store.shop_name;

  const stats = [
    { label: "Total Orders", value: totalOrders, icon: Package, color: "text-accent" },
    { label: "Total Earnings", value: `₹${Number(wallet?.total_earned ?? 0).toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-accent" },
    { label: "Wallet Balance", value: `₹${Number(wallet?.available_balance ?? 0).toLocaleString("en-IN")}`, icon: Wallet, color: "text-accent" },
    { label: "Pending Withdrawals", value: pendingWithdrawals.length, icon: Clock, color: "text-muted-foreground" },
  ];

  console.log("[dashboard] store_status:", storeStatus, "tailor_profile:", tailorProfile?.id);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {shopName}</p>
        </div>
        <MyStoreStatusBadge />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card rounded-2xl p-5 card-shadow">
              <Icon className={`h-6 w-6 ${stat.color} mb-2`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Recent Orders</h2>
        <Link to="/tailor/orders">
          <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 card-shadow text-center text-muted-foreground">
          No orders yet. Share your store link to start receiving orders.
        </div>
      ) : (
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Order</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Items</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Total</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="p-4 font-medium">{order.order_number}</td>
                    <td className="p-4 text-muted-foreground">{order.order_items?.map((i: any) => i.service_name).join(", ") || "—"}</td>
                    <td className="p-4"><Badge variant="secondary">{order.status}</Badge></td>
                    <td className="p-4 font-semibold">₹{Number(order.total_amount).toLocaleString("en-IN")}</td>
                    <td className="p-4 text-muted-foreground">{format(new Date(order.created_at), "dd MMM")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TailorDashboard;
