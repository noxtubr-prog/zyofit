import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Wallet,
  Clock,
  TrendingUp,
  ArrowDownToLine,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  IndianRupee,
} from "lucide-react";
import { format } from "date-fns";

const TailorWallet = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tailorProfile } = useQuery({
    queryKey: ["tailor-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tailor_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: wallet, isLoading: walletLoading } = useQuery({
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

  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet-transactions", wallet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!wallet?.id,
  });

  // Realtime: live updates for wallet balance + transactions
  useEffect(() => {
    if (!wallet?.id) return;
    const channel = supabase
      .channel(`tailor-wallet-${wallet.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tailor_wallets", filter: `id=eq.${wallet.id}` },
        () => {
          console.log("[wallet] realtime wallet update");
          queryClient.invalidateQueries({ queryKey: ["tailor-wallet"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions", filter: `wallet_id=eq.${wallet.id}` },
        () => {
          console.log("[wallet] realtime transaction");
          queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wallet?.id, queryClient]);

  const statCards = [
    { label: "Available Balance", value: wallet?.available_balance ?? 0, icon: Wallet, color: "text-emerald-500" },
    { label: "Pending Balance", value: wallet?.pending_balance ?? 0, icon: Clock, color: "text-amber-500" },
    { label: "Total Earned", value: wallet?.total_earned ?? 0, icon: TrendingUp, color: "text-accent" },
    { label: "Total Withdrawn", value: wallet?.total_withdrawn ?? 0, icon: ArrowDownToLine, color: "text-muted-foreground" },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "credit_pending":
      case "credit_available":
        return <ArrowDownRight className="h-4 w-4 text-emerald-500" />;
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case "commission":
        return <Minus className="h-4 w-4 text-muted-foreground" />;
      default:
        return <IndianRupee className="h-4 w-4" />;
    }
  };

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
        <p className="text-muted-foreground mt-1">Your earnings overview and transaction history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card rounded-2xl p-5 card-shadow">
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">₹{Number(stat.value).toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Transaction History */}
      <h2 className="text-lg font-bold text-foreground mb-4">Transaction History</h2>
      {transactions.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 card-shadow text-center text-muted-foreground">
          No transactions yet
        </div>
      ) : (
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/10">
                  <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="border-b border-primary/5 last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(tx.type)}
                        <span className="capitalize text-foreground">{tx.type.replace(/_/g, " ")}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{tx.description}</td>
                    <td className="p-4 font-semibold text-foreground">
                      {tx.type === "withdrawal" || tx.type === "commission" ? "-" : "+"}
                      ₹{Number(tx.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 text-muted-foreground">{format(new Date(tx.created_at), "dd MMM yyyy")}</td>
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

export default TailorWallet;
