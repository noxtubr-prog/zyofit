import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Truck, Package, MapPin, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const SHIPMENT_STATUSES = ["created", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed"];

const AdminShipments = () => {
  const qc = useQueryClient();

  // Orders ready for shipment (no shipment yet)
  const { data: ready = [] } = useQuery({
    queryKey: ["admin-ready-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, delivery_name, delivery_address, delivery_city, delivery_pincode, created_at, tailor_name")
        .eq("status", "ready")
        .order("ready_for_shipment_at", { ascending: false });
      if (error) throw error;
      // filter out orders that already have a shipment row
      const ids = (data || []).map(o => o.id);
      if (ids.length === 0) return [];
      const { data: existingShipments } = await supabase.from("shipments").select("order_id").in("order_id", ids);
      const taken = new Set((existingShipments || []).map(s => s.order_id));
      return (data || []).filter(o => !taken.has(o.id));
    },
  });

  // All shipments
  const { data: shipments = [] } = useQuery({
    queryKey: ["admin-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*, orders(order_number, delivery_name, delivery_city, total_amount, status, tailor_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase.channel("admin-shipments-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "shipments" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-shipments"] });
        qc.invalidateQueries({ queryKey: ["admin-ready-orders"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-ready-orders"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const createShipment = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc("admin_create_shipment", { p_order_id: orderId, p_courier_name: "ZyloFit Express" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Shipment created"); qc.invalidateQueries({ queryKey: ["admin-shipments"] }); qc.invalidateQueries({ queryKey: ["admin-ready-orders"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.rpc("admin_update_shipment_status", { p_shipment_id: id, p_status: status });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(`Shipment marked ${vars.status.replace(/_/g, " ")}`);
      if (vars.status === "delivered") toast.info("OTP generated for customer to confirm delivery");
      qc.invalidateQueries({ queryKey: ["admin-shipments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Shipments</h1>
        <p className="text-muted-foreground mt-1">Manage logistics for tailor orders</p>
      </div>

      {/* Ready for shipment */}
      <div className="mb-10">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-accent" /> Ready for Shipment ({ready.length})
        </h2>
        {ready.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 card-shadow text-sm text-muted-foreground text-center">
            No orders awaiting shipment.
          </div>
        ) : (
          <div className="space-y-3">
            {ready.map((o: any) => (
              <div key={o.id} className="bg-card rounded-2xl p-5 card-shadow flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-bold">{o.order_number}</div>
                  <p className="text-xs text-muted-foreground mt-1">{o.tailor_name} → {o.delivery_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {o.delivery_address}, {o.delivery_city} - {o.delivery_pincode}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">₹{Number(o.total_amount).toLocaleString("en-IN")}</span>
                  <Button size="sm" onClick={() => createShipment.mutate(o.id)} disabled={createShipment.isPending}>
                    <Truck className="h-3.5 w-3.5 mr-1.5" /> Create Shipment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active + past shipments */}
      <div>
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-accent" /> All Shipments ({shipments.length})
        </h2>
        {shipments.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 card-shadow text-sm text-muted-foreground text-center">
            No shipments yet.
          </div>
        ) : (
          <div className="space-y-3">
            {shipments.map((s: any) => (
              <div key={s.id} className="bg-card rounded-2xl p-5 card-shadow">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{s.orders?.order_number}</span>
                      <Badge variant="secondary" className="capitalize">{s.shipment_status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.orders?.tailor_name} → {s.orders?.delivery_name} • {s.orders?.delivery_city}</p>
                    <p className="text-xs font-mono mt-1">{s.tracking_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{Number(s.orders?.total_amount || 0).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(s.created_at), "dd MMM")}</p>
                  </div>
                </div>
                <div className="pt-3 border-t flex items-center gap-2 flex-wrap">
                  <Select value={s.shipment_status} onValueChange={(val) => updateStatus.mutate({ id: s.id, status: val })}>
                    <SelectTrigger className="w-[200px] h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SHIPMENT_STATUSES.map(st => <SelectItem key={st} value={st} className="capitalize">{st.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {s.tracking_url && (
                    <a href={s.tracking_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Track</Button>
                    </a>
                  )}
                  {s.orders?.status === "shipped" && s.shipment_status === "delivered" && (
                    <span className="text-xs text-amber-500 ml-auto">⏳ Awaiting customer OTP confirmation</span>
                  )}
                  {s.orders?.status === "delivered" && (
                    <span className="text-xs text-emerald-500 ml-auto">✅ Delivery confirmed — payment released</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminShipments;
