import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Package, Scissors, CheckCircle2, KeyRound, Truck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ORDER_STATUS_LABEL, isValidOrderStatus, type OrderStatus } from "@/lib/orderStatus";

const STATUS_LABEL = ORDER_STATUS_LABEL;

const TailorOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pickupOtp, setPickupOtp] = useState<{ otp: string; orderNumber: string } | null>(null);

  const { data: tailorProfile } = useQuery({
    queryKey: ["tailor-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tailor_profiles").select("id").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["tailor-orders", tailorProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(service_name, price, quantity)")
        .eq("tailor_profile_id", tailorProfile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tailorProfile?.id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (!tailorProfile?.id) return;
    const channel = supabase
      .channel(`tailor-orders-${tailorProfile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `tailor_profile_id=eq.${tailorProfile.id}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["tailor-orders", tailorProfile.id] });
          if (payload.eventType === "INSERT") toast.success("New order received!");
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tailorProfile?.id, queryClient]);

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      if (!isValidOrderStatus(status)) {
        throw new Error("Invalid order status update");
      }
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(`Marked as ${STATUS_LABEL[status as OrderStatus] ?? status}`);
      queryClient.invalidateQueries({ queryKey: ["tailor-orders"] });
    },
    onError: (e: Error) => toast.error(e.message || "Invalid order status update"),
  });

  const generatePickupOtp = useMutation({
    mutationFn: async (order: any) => {
      const { data, error } = await supabase.rpc("tailor_generate_pickup_otp", { p_order_id: order.id });
      if (error) throw error;
      return { otp: data as unknown as string, orderNumber: order.order_number };
    },
    onSuccess: (res) => { setPickupOtp(res); queryClient.invalidateQueries({ queryKey: ["tailor-orders"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!tailorProfile) {
    return <div className="bg-card rounded-2xl p-10 card-shadow text-center"><p className="text-muted-foreground">Please create your store first.</p></div>;
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>;
  }

  const renderActions = (order: any) => {
    const s = order.status;
    const isPickup = order.delivery_mode === "pickup";
    const pending = updateOrderStatus.isPending;

    // Placed → start stitching
    if (s === "placed") {
      return <Button size="sm" onClick={() => updateOrderStatus.mutate({ orderId: order.id, status: "stitching" })} disabled={pending}>
        <Scissors className="h-3.5 w-3.5 mr-1.5" /> Mark as Stitching
      </Button>;
    }

    // Stitching → Ready (or pickup OTP for self-pickup orders)
    if (s === "stitching") {
      if (isPickup) {
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => updateOrderStatus.mutate({ orderId: order.id, status: "ready" })} disabled={pending}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark as Ready
            </Button>
            <Button size="sm" onClick={() => generatePickupOtp.mutate(order)} disabled={generatePickupOtp.isPending}>
              <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Generate Pickup OTP
            </Button>
          </div>
        );
      }
      return <Button size="sm" onClick={() => updateOrderStatus.mutate({ orderId: order.id, status: "ready" })} disabled={pending}>
        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark as Ready
      </Button>;
    }

    // Ready → Shipped (tailor handoff). For pickup mode, show pickup OTP option.
    if (s === "ready") {
      if (isPickup) {
        return <Button size="sm" onClick={() => generatePickupOtp.mutate(order)} disabled={generatePickupOtp.isPending}>
          <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Generate Pickup OTP
        </Button>;
      }
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" /> Awaiting logistics pickup
          </span>
          <Button size="sm" variant="outline" onClick={() => updateOrderStatus.mutate({ orderId: order.id, status: "shipped" })} disabled={pending}>
            <Truck className="h-3.5 w-3.5 mr-1.5" /> Mark as Shipped
          </Button>
        </div>
      );
    }

    if (s === "shipped") {
      return <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> Handled by logistics — customer will confirm
      </span>;
    }

    if (s === "delivered") {
      return <span className="text-xs text-emerald-500 inline-flex items-center gap-1.5 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" /> Delivery Confirmed — payment released
      </span>;
    }

    if (s === "cancelled") {
      return <span className="text-xs text-destructive">Order cancelled</span>;
    }

    return null;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-1">You handle stitching — logistics handles delivery</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 card-shadow text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-card rounded-2xl p-5 card-shadow">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{order.order_number}</span>
                    <Badge variant="secondary">{STATUS_LABEL[order.status] || order.status}</Badge>
                    {order.delivery_mode === "pickup" && <Badge variant="outline">Self-Pickup</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.delivery_name || "Customer"} • {format(new Date(order.created_at), "dd MMM yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    {order.order_items?.map((i: any) => `${i.service_name} × ${i.quantity}`).join(", ") || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">₹{Number(order.total_amount).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="pt-3 border-t flex items-center gap-2 flex-wrap">
                {renderActions(order)}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!pickupOtp} onOpenChange={(o) => !o && setPickupOtp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pickup OTP for {pickupOtp?.orderNumber}</DialogTitle>
            <DialogDescription>
              Ask the customer to enter this OTP in their order tracking page to confirm pickup.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-5xl font-bold tracking-[0.5em] text-emerald-500 tabular-nums">{pickupOtp?.otp}</p>
            <p className="text-xs text-muted-foreground mt-4">Share verbally with the customer in person only.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TailorOrders;
