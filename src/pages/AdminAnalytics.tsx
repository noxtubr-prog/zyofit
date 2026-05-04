import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IndianRupee, Package, Users, TrendingUp, Store } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const AdminAnalytics = () => {
  const { data: orders = [] } = useQuery({
    queryKey: ["analytics-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_amount, status, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: tailorCount = 0 } = useQuery({
    queryKey: ["analytics-tailors"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tailor_profiles")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: userCount = 0 } = useQuery({
    queryKey: ["analytics-users"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const totalRevenue = useMemo(
    () => orders.reduce((sum, o: any) => sum + Number(o.total_amount), 0),
    [orders]
  );

  const platformEarnings = useMemo(() => Math.round(totalRevenue * 0.1), [totalRevenue]);

  const chartData = useMemo(() => {
    const last14 = Array.from({ length: 14 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 13 - i));
      return { date, label: format(date, "dd MMM"), revenue: 0, count: 0 };
    });

    orders.forEach((o: any) => {
      const oDate = startOfDay(new Date(o.created_at));
      const entry = last14.find((d) => d.date.getTime() === oDate.getTime());
      if (entry) {
        entry.revenue += Number(o.total_amount);
        entry.count += 1;
      }
    });

    return last14;
  }, [orders]);

  const stats = [
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: IndianRupee },
    { label: "Platform Earnings (10%)", value: `₹${platformEarnings.toLocaleString("en-IN")}`, icon: TrendingUp },
    { label: "Total Orders", value: orders.length, icon: Package },
    { label: "Total Users", value: userCount, icon: Users },
    { label: "Total Tailors", value: tailorCount, icon: Store },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Platform performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card rounded-2xl p-5 card-shadow">
              <Icon className="h-5 w-5 text-accent mb-2" />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-2xl p-6 card-shadow">
        <h2 className="text-lg font-bold mb-4">Revenue (Last 14 Days)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  color: "hsl(var(--foreground))",
                  fontSize: 12,
                }}
                formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 card-shadow mt-6">
        <h2 className="text-lg font-bold mb-4">Orders (Last 14 Days)</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  color: "hsl(var(--foreground))",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" name="Orders" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
