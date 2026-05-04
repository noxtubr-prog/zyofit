import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowUpRight,
  Wallet,
  AlertCircle,
  Building2,
  ShieldCheck,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { z } from "zod";

const MIN_WITHDRAWAL = 500;

const bankSchema = z.object({
  account_holder_name: z.string().trim().min(2, "Enter account holder name").max(100),
  bank_name: z.string().trim().min(2, "Enter bank name").max(100),
  account_number: z.string().trim().regex(/^\d{6,20}$/, "Account number must be 6–20 digits"),
  ifsc_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
});

const maskAccount = (num: string) => {
  if (!num) return "";
  if (num.length <= 4) return "••••";
  return "••••••" + num.slice(-4);
};

const TailorWithdraw = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankEditing, setBankEditing] = useState(false);
  const [bankForm, setBankForm] = useState({
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
  });

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

  const { data: bankDetails } = useQuery({
    queryKey: ["bank-details", tailorProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tailor_bank_details")
        .select("*")
        .eq("tailor_profile_id", tailorProfile!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tailorProfile?.id,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["withdrawal-requests", wallet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("wallet_id", wallet!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!wallet?.id,
  });

  // Realtime — wallet & withdrawals
  useEffect(() => {
    if (!wallet?.id) return;
    const channel = supabase
      .channel(`withdraw-${wallet.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tailor_wallets", filter: `id=eq.${wallet.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["tailor-wallet"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawal_requests", filter: `wallet_id=eq.${wallet.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wallet?.id, queryClient]);

  useEffect(() => {
    if (bankDetails && !bankEditing) {
      setBankForm({
        account_holder_name: bankDetails.account_holder_name,
        bank_name: bankDetails.bank_name,
        account_number: bankDetails.account_number,
        ifsc_code: bankDetails.ifsc_code,
      });
    }
  }, [bankDetails, bankEditing]);

  const saveBankMutation = useMutation({
    mutationFn: async () => {
      if (!tailorProfile?.id) throw new Error("Profile not ready");
      const parsed = bankSchema.safeParse(bankForm);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message ?? "Invalid bank details");
      }
      const payload = {
        tailor_profile_id: tailorProfile.id,
        account_holder_name: parsed.data.account_holder_name,
        bank_name: parsed.data.bank_name,
        account_number: parsed.data.account_number,
        ifsc_code: parsed.data.ifsc_code,
      };
      const { error } = await supabase
        .from("tailor_bank_details")
        .upsert(payload, { onConflict: "tailor_profile_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bank details saved securely");
      setBankEditing(false);
      queryClient.invalidateQueries({ queryKey: ["bank-details"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!wallet) throw new Error("Wallet not found");
      console.log("[withdraw] requesting", { wallet_id: wallet.id, amount });
      const { data, error } = await supabase.rpc("request_withdrawal", {
        p_wallet_id: wallet.id,
        p_amount: amount,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Withdrawal request submitted — admin will review shortly");
      setWithdrawAmount("");
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["tailor-wallet"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paid": return "default" as const;
      case "approved": return "default" as const;
      case "rejected": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  const availableBalance = Number(wallet?.available_balance ?? 0);
  const canWithdraw = availableBalance >= MIN_WITHDRAWAL;
  const hasOpen = withdrawals.some((w: any) => w.status === "pending" || w.status === "approved");
  const hasBank = !!bankDetails;
  const showBankForm = bankEditing || !hasBank;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Withdraw Funds</h1>
        <p className="text-muted-foreground mt-1">Request a payout to your saved bank account</p>
      </div>

      {/* Available Balance */}
      <div className="bg-card rounded-2xl p-6 card-shadow mb-6 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
          <Wallet className="h-6 w-6 text-accent" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Available for Withdrawal</p>
          <p className="text-3xl font-bold text-foreground">₹{availableBalance.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Bank details card */}
      <div className="bg-card rounded-2xl p-6 card-shadow mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-foreground">Bank Account</h2>
          </div>
          {hasBank && !bankEditing && (
            <Button variant="outline" size="sm" onClick={() => setBankEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>

        {!showBankForm && hasBank ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Account Holder</p>
              <p className="font-medium">{bankDetails!.account_holder_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bank</p>
              <p className="font-medium">{bankDetails!.bank_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Account Number</p>
              <p className="font-mono font-medium">{maskAccount(bankDetails!.account_number)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">IFSC</p>
              <p className="font-mono font-medium">{bankDetails!.ifsc_code}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Account Holder Name</label>
                <Input
                  value={bankForm.account_holder_name}
                  onChange={e => setBankForm(f => ({ ...f, account_holder_name: e.target.value }))}
                  className="rounded-xl h-11"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  <Building2 className="h-3.5 w-3.5 inline mr-1" />Bank Name
                </label>
                <Input
                  value={bankForm.bank_name}
                  onChange={e => setBankForm(f => ({ ...f, bank_name: e.target.value }))}
                  className="rounded-xl h-11"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Account Number</label>
                <Input
                  value={bankForm.account_number}
                  onChange={e => setBankForm(f => ({ ...f, account_number: e.target.value.replace(/\D/g, "") }))}
                  className="rounded-xl h-11 font-mono"
                  maxLength={20}
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">IFSC Code</label>
                <Input
                  value={bankForm.ifsc_code}
                  onChange={e => setBankForm(f => ({ ...f, ifsc_code: e.target.value.toUpperCase() }))}
                  className="rounded-xl h-11 font-mono"
                  maxLength={11}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => saveBankMutation.mutate()} disabled={saveBankMutation.isPending}>
                {saveBankMutation.isPending ? "Saving..." : "Save Bank Details"}
              </Button>
              {hasBank && (
                <Button variant="outline" onClick={() => setBankEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Form */}
      <div className="bg-card rounded-2xl p-6 card-shadow mb-8">
        <h2 className="text-lg font-bold text-foreground mb-4">New Withdrawal Request</h2>

        <div className="flex items-start gap-2 bg-accent/5 border border-accent/20 rounded-xl p-3 mb-6">
          <AlertCircle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Minimum withdrawal amount is <span className="font-semibold text-foreground">₹{MIN_WITHDRAWAL.toLocaleString("en-IN")}</span>. Payouts are processed within 2-3 business days after admin approval.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">Withdrawal Amount (₹)</label>
            <Input
              type="number"
              placeholder={`Min ₹${MIN_WITHDRAWAL}`}
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              min={MIN_WITHDRAWAL}
              max={availableBalance}
              className="rounded-xl h-12 text-lg"
            />
          </div>

          <Button
            size="lg"
            onClick={() => withdrawMutation.mutate(Number(withdrawAmount))}
            disabled={
              withdrawMutation.isPending ||
              !withdrawAmount ||
              Number(withdrawAmount) < MIN_WITHDRAWAL ||
              Number(withdrawAmount) > availableBalance ||
              !canWithdraw ||
              hasOpen ||
              !hasBank
            }
          >
            {withdrawMutation.isPending ? "Submitting..." : "Submit Withdrawal Request"}
            {!withdrawMutation.isPending && <ArrowUpRight className="h-4 w-4" />}
          </Button>

          {!hasBank && (
            <p className="text-xs text-amber-500">Save your bank details above before submitting a request.</p>
          )}
          {hasOpen && hasBank && (
            <p className="text-xs text-amber-500">You have a withdrawal in progress. Please wait for it to be processed.</p>
          )}
          {!canWithdraw && !hasOpen && hasBank && (
            <p className="text-xs text-muted-foreground">Insufficient balance. Minimum ₹{MIN_WITHDRAWAL} required.</p>
          )}
        </div>
      </div>

      {/* History */}
      <h2 className="text-lg font-bold text-foreground mb-4">Withdrawal History</h2>
      {withdrawals.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 card-shadow text-center text-muted-foreground">
          No withdrawal requests yet
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w: any) => (
            <div key={w.id} className="bg-card rounded-2xl p-4 card-shadow flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">₹{Number(w.amount).toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(w.created_at), "dd MMM yyyy, hh:mm a")}
                </p>
                {w.admin_note && (
                  <p className="text-xs text-muted-foreground mt-1">Note: {w.admin_note}</p>
                )}
                {w.payout_reference && (
                  <p className="text-xs text-muted-foreground mt-1">Ref: {w.payout_reference}</p>
                )}
              </div>
              <Badge variant={getStatusVariant(w.status)}>{w.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TailorWithdraw;
