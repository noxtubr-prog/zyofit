import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Save, Loader2, Ruler } from "lucide-react";
import { toast } from "sonner";
import TwoFactorCard from "@/components/TwoFactorCard";

const UserProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Measurements
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [newMeasurement, setNewMeasurement] = useState({
    chest: "", waist: "", hip: "", shoulder: "", sleeve_length: "", length: "", notes: "",
  });
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [savingMeasurement, setSavingMeasurement] = useState(false);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    const fetchData = async () => {
      const [profileRes, measurementsRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("measurements").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("id, order_number, status, total_amount, tailor_name, created_at, order_items(service_name)").eq("customer_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (profileRes.data) {
        setFullName(profileRes.data.full_name || "");
        setPhone(profileRes.data.phone || "");
      }
      setMeasurements(measurementsRes.data || []);
      setOrders(ordersRes.data || []);
      setLoading(false);
    };
    fetchData();

    // Realtime: customer's orders list reflects status changes immediately
    const channel = supabase
      .channel(`customer-orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${user.id}` },
        () => {
          supabase
            .from("orders")
            .select("id, order_number, status, total_amount, tailor_name, created_at, order_items(service_name)")
            .eq("customer_id", user.id)
            .order("created_at", { ascending: false })
            .then(({ data }) => setOrders(data || []));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, authLoading, navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim(), phone: phone.trim() }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated!");
  };

  const handleSaveMeasurement = async () => {
    if (!user) return;
    setSavingMeasurement(true);
    const payload: any = {
      customer_id: user.id,
      notes: newMeasurement.notes || null,
    };
    ["chest", "waist", "hip", "shoulder", "sleeve_length", "length"].forEach(k => {
      const v = parseFloat((newMeasurement as any)[k]);
      payload[k] = isNaN(v) ? null : v;
    });

    const { error } = await supabase.from("measurements").insert(payload);
    setSavingMeasurement(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Measurement saved!");
    setShowMeasurementForm(false);
    setNewMeasurement({ chest: "", waist: "", hip: "", shoulder: "", sleeve_length: "", length: "", notes: "" });
    // Refresh
    const { data } = await supabase.from("measurements").select("*").eq("customer_id", user.id).order("created_at", { ascending: false });
    setMeasurements(data || []);
  };

  if (authLoading || loading) {
    return <div className="container py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }
  if (!user) return null;

  const statusLabel: Record<string, string> = {
    placed: "Order Placed", stitching: "Stitching", ready: "Ready", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
  };

  return (
    <div className="container py-10 max-w-2xl space-y-8">
      {/* Profile Card */}
      <div className="bg-card rounded-2xl p-6 card-shadow">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center">
            <User className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full Name</label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="rounded-xl h-12" placeholder="Your name" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="rounded-xl h-12" placeholder="+91 ..." />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <TwoFactorCard />

      {/* Measurements */}
      <div className="bg-card rounded-2xl p-6 card-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Ruler className="h-5 w-5" /> Measurements</h2>
          <Button size="sm" variant="outline" onClick={() => setShowMeasurementForm(!showMeasurementForm)}>
            {showMeasurementForm ? "Cancel" : "+ New"}
          </Button>
        </div>

        {showMeasurementForm && (
          <div className="border rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "chest", label: "Chest" }, { key: "waist", label: "Waist" },
                { key: "hip", label: "Hip" }, { key: "shoulder", label: "Shoulder" },
                { key: "sleeve_length", label: "Sleeve" }, { key: "length", label: "Length" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-medium mb-1 block">{label} (in)</label>
                  <Input type="number" value={(newMeasurement as any)[key]} onChange={e => setNewMeasurement(prev => ({ ...prev, [key]: e.target.value }))} className="rounded-lg h-10" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Notes</label>
              <Input value={newMeasurement.notes} onChange={e => setNewMeasurement(prev => ({ ...prev, notes: e.target.value }))} className="rounded-lg h-10" placeholder="Optional notes" />
            </div>
            <Button onClick={handleSaveMeasurement} disabled={savingMeasurement} size="sm" className="w-full">
              {savingMeasurement ? "Saving..." : "Save Measurement"}
            </Button>
          </div>
        )}

        {measurements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No saved measurements yet.</p>
        ) : (
          <div className="space-y-2">
            {measurements.map((m: any) => (
              <div key={m.id} className="border rounded-xl p-3 text-sm">
                <div className="flex flex-wrap gap-3 text-muted-foreground">
                  {m.chest && <span>Chest: {m.chest}"</span>}
                  {m.waist && <span>Waist: {m.waist}"</span>}
                  {m.hip && <span>Hip: {m.hip}"</span>}
                  {m.shoulder && <span>Shoulder: {m.shoulder}"</span>}
                  {m.sleeve_length && <span>Sleeve: {m.sleeve_length}"</span>}
                  {m.length && <span>Length: {m.length}"</span>}
                </div>
                {m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}
                <p className="text-xs text-muted-foreground/60 mt-1">{new Date(m.created_at).toLocaleDateString("en-IN")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="bg-card rounded-2xl p-6 card-shadow">
        <h2 className="text-xl font-bold mb-4">Order History</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => (
              <div key={order.id} className="border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/order-tracking/${order.id}`)}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm">{order.order_number}</span>
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded-md">{statusLabel[order.status] || order.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{order.tailor_name} • {new Date(order.created_at).toLocaleDateString("en-IN")}</p>
                <p className="font-bold text-sm mt-1">₹{order.total_amount?.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
