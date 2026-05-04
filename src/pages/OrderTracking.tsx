import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Package, Scissors, CheckCircle2, Truck, Home, Sparkles, Receipt, KeyRound, ExternalLink, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

// Canonical order flow steps
const SHIPPING_STEPS = [
  { key: "placed", label: "Placed", icon: Package },
  { key: "stitching", label: "Stitching", icon: Scissors },
  { key: "ready", label: "Ready", icon: CheckCircle2 },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];
const PICKUP_STEPS = [
  { key: "placed", label: "Placed", icon: Package },
  { key: "stitching", label: "Stitching", icon: Scissors },
  { key: "ready", label: "Ready for Pickup", icon: KeyRound },
  { key: "delivered", label: "Picked Up", icon: Home },
];

const stepIndex = (status: string, steps: { key: string }[]) => {
  const direct = steps.findIndex(s => s.key === status);
  if (direct >= 0) return direct;
  if (status === "cancelled") return 0;
  return 0;
};

const OrderTracking = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState("");
  const [confirming, setConfirming] = useState(false);

  const refresh = async () => {
    if (!id) return;
    const { data: o } = await supabase
      .from("orders")
      .select("id, order_number, status, total_amount, tailor_name, created_at, delivery_mode, order_items(service_name, price, quantity)")
      .eq("id", id).maybeSingle();
    if (o) setOrder(o);
    const { data: s } = await supabase.from("shipments").select("*").eq("order_id", id).maybeSingle();
    setShipment(s);
  };

  useEffect(() => {
    if (!id || !user) { setLoading(false); return; }
    (async () => { await refresh(); setLoading(false); })();

    const channel = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "shipments", filter: `order_id=eq.${id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const handleConfirmOtp = async () => {
    if (!/^\d{6}$/.test(otpInput)) { toast.error("Enter the 6-digit OTP"); return; }
    setConfirming(true);
    const { error } = await supabase.rpc("confirm_delivery_with_otp", { p_order_id: id!, p_otp: otpInput });
    setConfirming(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Delivery confirmed! Thank you.");
    setOtpInput("");
    refresh();
  };

  if (loading) return <LoadingSpinner text="Loading order details…" />;
  if (!order) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground text-lg">Order not found.</p>
        <Link to="/profile"><Button variant="accent" className="mt-6">Go to My Orders</Button></Link>
      </div>
    );
  }

  const isPickup = order.delivery_mode === "pickup";
  const steps = isPickup ? PICKUP_STEPS : SHIPPING_STEPS;
  const currentIdx = stepIndex(order.status, steps);
  const progress = (currentIdx / (steps.length - 1)) * 100;
  const isConfirmed = order.status === "delivered";
  // Customer OTP confirmation is required when shipment was marked delivered by courier OR pickup OTP was generated; check for an active OTP via shipment status / pickup signal
  const awaitingOtp = (order.status === "shipped" && shipment?.shipment_status === "delivered") || (isPickup && order.status === "ready");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="container py-10 max-w-3xl">
        <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
          className="relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-6 md:p-10 shadow-[0_8px_60px_-12px_hsl(152_76%_50%/0.18)]">
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-emerald-500/10" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/80 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Order
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{order.order_number}</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                <span className="text-foreground/80 font-medium">{order.tailor_name || "Tailor"}</span>
                <span className="mx-2 opacity-40">•</span>
                {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                <span className="mx-2 opacity-40">•</span>
                {isPickup ? "Self-Pickup" : "Home Delivery"}
              </p>
            </div>
            <div className="flex sm:flex-col sm:items-end items-center justify-between gap-3">
              <span className="text-2xl md:text-3xl font-bold text-emerald-400 tabular-nums">₹{order.total_amount?.toLocaleString()}</span>
            </div>
          </div>

          {/* Confirmed banner */}
          <AnimatePresence>
            {isConfirmed && (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="relative mb-8 overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-5 flex items-center gap-4">
                <div className="h-11 w-11 shrink-0 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-emerald-400">✅ Delivery Confirmed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Payment has been released to the tailor. Thank you!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timeline (mobile vertical) */}
          <div className="mb-10 relative pl-3">
            <div className="absolute left-[22px] top-2 bottom-2 w-[2px] bg-white/5 rounded-full overflow-hidden">
              <motion.div className="w-full bg-gradient-to-b from-emerald-500 to-emerald-400"
                initial={{ height: 0 }} animate={{ height: `${progress}%` }} transition={{ duration: 0.8 }} />
            </div>
            <div className="space-y-5">
              {steps.map((step, idx) => {
                const completed = idx < currentIdx;
                const active = idx === currentIdx;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="relative flex items-center gap-4">
                    <div className={`relative z-10 h-10 w-10 shrink-0 rounded-full flex items-center justify-center border ${
                      completed ? "bg-emerald-500 border-emerald-400" : active ? "bg-emerald-500/20 border-emerald-400" : "bg-background border-white/10"
                    }`}>
                      {active && <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />}
                      <Icon className={`h-[18px] w-[18px] ${completed ? "text-white" : active ? "text-emerald-300" : "text-muted-foreground/60"}`} strokeWidth={completed || active ? 2.5 : 1.75} />
                    </div>
                    <span className={`text-sm font-medium ${active ? "text-emerald-400" : completed ? "text-foreground" : "text-muted-foreground/60"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipment tracking */}
          {shipment && (
            <div className="mb-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold tracking-tight">Shipment</h3>
                <Badge>{shipment.shipment_status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Courier</p><p className="font-medium">{shipment.courier_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Tracking ID</p><p className="font-mono text-sm">{shipment.tracking_id}</p></div>
                {shipment.estimated_delivery && (
                  <div><p className="text-xs text-muted-foreground">Est. Delivery</p><p className="font-medium">{new Date(shipment.estimated_delivery).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p></div>
                )}
              </div>
              {shipment.tracking_url && (
                <a href={shipment.tracking_url} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="mt-4"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Track Order</Button>
                </a>
              )}
            </div>
          )}

          {/* OTP confirmation */}
          {awaitingOtp && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="font-semibold">Confirm Delivery with OTP</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {isPickup
                  ? "Ask the tailor for the 6-digit pickup OTP and enter it below to confirm you've received your order."
                  : "Your courier has marked the order as delivered. Enter the 6-digit OTP shared with you to confirm receipt and release payment."}
              </p>
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="font-mono text-lg tracking-[0.4em] text-center"
                />
                <Button onClick={handleConfirmOtp} disabled={confirming || otpInput.length !== 6}>
                  {confirming ? "Confirming…" : "Confirm"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Items */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-4 w-4 text-emerald-400" />
              <h3 className="font-semibold tracking-tight">Items</h3>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {order.order_items?.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Scissors className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.service_name}</p>
                      <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">₹{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.07] flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-emerald-400">₹{order.total_amount?.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// Tiny inline Badge to avoid extra import noise
const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 capitalize">
    {children}
  </span>
);

export default OrderTracking;
