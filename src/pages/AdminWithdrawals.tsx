import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Banknote } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type ActionKind = "approve" | "reject" | "paid";

const maskAccount = (num?: string | null) => {
  if (!num) return "—";
  if (num.length <= 4) return "••••";
  return "••••••" + num.slice(-4);
};

const AdminWithdrawals = () => {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<{
    id: string;
    kind: ActionKind;
    amount: number;
    shopName: string;
  } | null>(null);
  const [note, setNote] = useState("");
  const [payoutRef, setPayoutRef] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select(`
          *,
          tailor_wallets:wallet_id (
            id,
            available_balance,
            tailor_profile_id,
            tailor_profiles:tailor_profile_id (
              id,
              shop_name,
              user_id
            )
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Realtime: withdrawals list
  useEffect(() => {
    const channel = supabase
      .channel("admin-withdrawals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawal_requests" },
        () => queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Fetch bank details for the currently selected request
  const { data: dialogBank } = useQuery({
    queryKey: ["dialog-bank", dialog?.id],
    enabled: !!dialog,
    queryFn: async () => {
      const req = requests.find((r: any) => r.id === dialog!.id) as any;
      const profileId = req?.tailor_wallets?.tailor_profiles?.id;
      if (!profileId) return null;
      const { data, error } = await supabase
        .from("tailor_bank_details")
        .select("*")
        .eq("tailor_profile_id", profileId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: ActionKind }) => {
      console.log("[admin-withdrawal] action", { id, kind });
      if (kind === "approve") {
        const { error } = await supabase.rpc("approve_withdrawal", {
          p_request_id: id,
          p_note: note || null,
        });
        if (error) throw error;
      } else if (kind === "reject") {
        const { error } = await supabase.rpc("reject_withdrawal", {
          p_request_id: id,
          p_note: note || null,
        });
        if (error) throw error;
      } else if (kind === "paid") {
        const { error } = await supabase.rpc("mark_withdrawal_paid", {
          p_request_id: id,
          p_payout_reference: payoutRef || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      toast.success(`Withdrawal ${vars.kind === "paid" ? "marked paid" : vars.kind + "d"}`);
      setDialog(null);
      setNote("");
      setPayoutRef("");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending": return "secondary" as const;
      case "approved": return "default" as const;
      case "paid": return "default" as const;
      case "rejected": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Withdrawal Requests</h1>
        <p className="text-muted-foreground mt-1">Review, approve, reject, and mark payouts as paid</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 card-shadow text-center text-muted-foreground">
          No withdrawal requests yet
        </div>
      ) : (
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Tailor</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Requested</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Note</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req: any) => {
                  const shopName = req.tailor_wallets?.tailor_profiles?.shop_name ?? "Unknown";
                  return (
                    <tr key={req.id} className="border-b last:border-0">
                      <td className="p-4 font-medium">{shopName}</td>
                      <td className="p-4 font-semibold">₹{Number(req.amount).toLocaleString("en-IN")}</td>
                      <td className="p-4">
                        <Badge variant={getStatusVariant(req.status)}>{req.status}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {format(new Date(req.created_at), "dd MMM yyyy")}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs max-w-[200px] truncate">
                        {req.admin_note || req.payout_reference || "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {req.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => setDialog({ id: req.id, kind: "approve", amount: Number(req.amount), shopName })}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDialog({ id: req.id, kind: "reject", amount: Number(req.amount), shopName })}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {req.status === "approved" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => setDialog({ id: req.id, kind: "paid", amount: Number(req.amount), shopName })}
                              >
                                <Banknote className="h-4 w-4 mr-1" /> Mark Paid
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDialog({ id: req.id, kind: "reject", amount: Number(req.amount), shopName })}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(req.status === "paid" || req.status === "rejected") && (
                            <span className="text-xs text-muted-foreground">Closed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog
        open={!!dialog}
        onOpenChange={() => { setDialog(null); setNote(""); setPayoutRef(""); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "approve" && "Approve Withdrawal"}
              {dialog?.kind === "reject" && "Reject Withdrawal"}
              {dialog?.kind === "paid" && "Mark Withdrawal as Paid"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 text-sm">
            <p>
              <span className="text-muted-foreground">Tailor:</span>{" "}
              <span className="font-medium">{dialog?.shopName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Amount:</span>{" "}
              <span className="font-semibold">₹{dialog ? Number(dialog.amount).toLocaleString("en-IN") : 0}</span>
            </p>

            {dialogBank ? (
              <div className="rounded-xl border border-border p-3 bg-muted/30 text-xs space-y-1">
                <p><span className="text-muted-foreground">Holder:</span> <span className="font-medium">{dialogBank.account_holder_name}</span></p>
                <p><span className="text-muted-foreground">Bank:</span> <span className="font-medium">{dialogBank.bank_name}</span></p>
                <p><span className="text-muted-foreground">Account:</span> <span className="font-mono">{maskAccount(dialogBank.account_number)}</span></p>
                <p><span className="text-muted-foreground">IFSC:</span> <span className="font-mono">{dialogBank.ifsc_code}</span></p>
              </div>
            ) : (
              <p className="text-xs text-amber-500">No bank details on file.</p>
            )}

            {dialog?.kind === "paid" ? (
              <Input
                placeholder="Payout reference / UTR (optional)"
                value={payoutRef}
                onChange={e => setPayoutRef(e.target.value)}
              />
            ) : (
              <Textarea
                placeholder="Note (optional)"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(null); setNote(""); setPayoutRef(""); }}>
              Cancel
            </Button>
            <Button
              variant={dialog?.kind === "reject" ? "destructive" : "default"}
              onClick={() => dialog && actionMutation.mutate({ id: dialog.id, kind: dialog.kind })}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending
                ? "Processing..."
                : dialog?.kind === "approve"
                ? "Approve"
                : dialog?.kind === "reject"
                ? "Reject & Refund"
                : "Confirm Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWithdrawals;
