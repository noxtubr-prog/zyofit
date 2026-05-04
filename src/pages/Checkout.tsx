import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Check, ArrowLeft, CreditCard, Banknote, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MeasurementForm, { type MeasurementData } from "@/components/MeasurementForm";

const INITIAL_MEASUREMENTS: MeasurementData = {
  chest: "", waist: "", hip: "", length: "", shoulder: "", sleeve_length: "",
  unit: "inches", file: null, notes: "",
};

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("online");
  const [deliveryMode, setDeliveryMode] = useState<"shipping" | "pickup">("shipping");
  const [measurements, setMeasurements] = useState<MeasurementData>(INITIAL_MEASUREMENTS);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Delivery fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  const handleDetectLocation = () => {
    if (!("geolocation" in navigator)) {
      toast({ title: "Not supported", description: "Your browser doesn't support geolocation.", variant: "destructive" });
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Free reverse-geocoding via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { "Accept": "application/json" } }
          );
          if (!res.ok) throw new Error("Reverse geocoding failed");
          const data = await res.json();
          const a = data.address || {};
          const street = [a.house_number, a.road, a.neighbourhood, a.suburb].filter(Boolean).join(", ");
          const detectedCity = a.city || a.town || a.village || a.county || "";
          const detectedPin = a.postcode?.replace(/\s/g, "").slice(0, 6) || "";
          if (street) setAddress(street);
          else if (data.display_name) setAddress(String(data.display_name).split(",").slice(0, 3).join(", "));
          if (detectedCity) setCity(detectedCity);
          if (detectedPin && /^\d{6}$/.test(detectedPin)) setPincode(detectedPin);
          toast({ title: "Location detected", description: "Address fields auto-filled. Please verify before placing your order." });
        } catch (err) {
          console.error("[geolocation] reverse geocode error:", err);
          toast({ title: "Couldn't fetch address", description: "Please enter your address manually.", variant: "destructive" });
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast({ title: "Permission denied", description: "Location access denied. Please enter manually.", variant: "destructive" });
        } else {
          toast({ title: "Couldn't get location", description: "Please enter your address manually.", variant: "destructive" });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  if (!user) {
    toast({ title: "Please login", description: "You need to be logged in to checkout.", variant: "destructive" });
    navigate("/login");
    return null;
  }

  const validateMeasurements = (): boolean => {
    const hasManual = [measurements.chest, measurements.waist, measurements.hip, measurements.length, measurements.shoulder].some(v => v.trim() !== "");
    const hasFile = !!measurements.file;
    if (!hasManual && !hasFile) {
      toast({ title: "Measurements required", description: "Please enter your measurements or upload a measurement sheet.", variant: "destructive" });
      return false;
    }
    // Validate numeric values
    const numericFields = ["chest", "waist", "hip", "length", "shoulder", "sleeve_length"] as const;
    for (const f of numericFields) {
      const val = measurements[f].trim();
      if (val && (isNaN(Number(val)) || Number(val) <= 0 || Number(val) > 200)) {
        toast({ title: "Invalid measurement", description: `${f.replace("_", " ")} must be a positive number (max 200).`, variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (placing) return;

    if (deliveryMode === "shipping") {
      if (!name.trim() || !phone.trim() || !address.trim() || !city.trim() || !pincode.trim()) {
        toast({ title: "Missing fields", description: "Please fill in all delivery details.", variant: "destructive" });
        return;
      }
      if (!/^\d{10}$/.test(phone)) {
        toast({ title: "Invalid phone", description: "Please enter a valid 10-digit mobile number.", variant: "destructive" });
        return;
      }
      if (!/^\d{6}$/.test(pincode)) {
        toast({ title: "Invalid PIN code", description: "Please enter a valid 6-digit PIN code.", variant: "destructive" });
        return;
      }
    } else {
      if (!name.trim() || !phone.trim()) {
        toast({ title: "Missing fields", description: "Please provide your name and phone for pickup.", variant: "destructive" });
        return;
      }
      if (!/^\d{10}$/.test(phone)) {
        toast({ title: "Invalid phone", description: "Please enter a valid 10-digit mobile number.", variant: "destructive" });
        return;
      }
    }

    if (!validateMeasurements()) return;

    setPlacing(true);

    try {
      // Simulate online payment
      if (paymentMethod === "online") {
        await new Promise(r => setTimeout(r, 1500));
      }

      // Upload measurement file if present
      let measurementFileUrl: string | null = null;
      if (measurements.file) {
        const ext = measurements.file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("measurement-files")
          .upload(path, measurements.file);
        if (uploadErr) throw uploadErr;
        measurementFileUrl = path;
      }

      const tailorName = items[0]?.service.tailorName || "ZyloFit Tailor";

      // Resolve tailor_profile_id from the first item's service
      let tailorProfileId: string | null = null;
      if (items[0]?.service.id) {
        const { data: svcData } = await supabase
          .from("services")
          .select("tailor_profile_id")
          .eq("id", items[0].service.id)
          .maybeSingle();
        tailorProfileId = svcData?.tailor_profile_id || null;
      }

      console.log("[checkout] Creating order - tailor_profile_id:", tailorProfileId, "tailor_name:", tailorName);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          order_number: "TEMP",
          total_amount: total,
          status: "placed",
          delivery_mode: deliveryMode,
          delivery_name: name.trim(),
          delivery_phone: phone.trim(),
          delivery_address: deliveryMode === "shipping" ? address.trim() : null,
          delivery_city: deliveryMode === "shipping" ? city.trim() : null,
          delivery_pincode: deliveryMode === "shipping" ? pincode.trim() : null,
          tailor_name: tailorName,
          tailor_profile_id: tailorProfileId,
        } as any)
        .select()
        .single();

      if (orderError) throw orderError;

      // Save measurements
      const measurementPayload: any = {
        order_id: order.id,
        customer_id: user.id,
        unit: measurements.unit,
        notes: measurements.notes || null,
        measurement_file_url: measurementFileUrl,
      };
      const numericFields = ["chest", "waist", "hip", "length", "shoulder", "sleeve_length"] as const;
      for (const f of numericFields) {
        const val = measurements[f].trim();
        measurementPayload[f] = val ? Number(val) : null;
      }

      const { data: measurementRow, error: measErr } = await supabase
        .from("measurements")
        .insert(measurementPayload)
        .select()
        .single();
      if (measErr) throw measErr;

      // Link measurement to order
      await supabase.from("orders").update({ measurement_id: measurementRow.id } as any).eq("id", order.id);

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        service_id: item.service.id,
        service_name: item.service.name,
        quantity: item.quantity,
        price: item.service.price,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Create payment
      const { error: paymentError } = await supabase.from("payments").insert({
        order_id: order.id,
        customer_id: user.id,
        amount: total,
        status: "successful",
        payment_method: paymentMethod,
        transaction_id: paymentMethod === "online" ? `TXN-${Date.now()}` : null,
      });
      if (paymentError) throw paymentError;

      clearCart();
      toast({ title: "Order Placed!", description: "Your order has been confirmed." });
      navigate(`/order-tracking/${order.id}`);
    } catch (err: any) {
      console.error("Order error:", err);
      toast({ title: "Order failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="container py-10 max-w-2xl">
      <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to Cart
      </Link>
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Checkout</h1>

      <div className="space-y-6">
        {/* Delivery Mode */}
        <div className="bg-card rounded-2xl p-6 card-shadow">
          <h2 className="font-bold text-lg mb-4">Delivery Method</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeliveryMode("shipping")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${deliveryMode === "shipping" ? "border-accent bg-accent/5" : "border-border"}`}
            >
              <p className="font-semibold text-sm">Home Delivery</p>
              <p className="text-xs text-muted-foreground mt-1">Shipped to your address</p>
            </button>
            <button
              onClick={() => setDeliveryMode("pickup")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${deliveryMode === "pickup" ? "border-accent bg-accent/5" : "border-border"}`}
            >
              <p className="font-semibold text-sm">Pickup from Store</p>
              <p className="text-xs text-muted-foreground mt-1">Collect from tailor</p>
            </button>
          </div>
        </div>

        {/* Delivery / Contact details */}
        <div className="bg-card rounded-2xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="font-bold text-lg">{deliveryMode === "shipping" ? "Delivery Address" : "Contact Details"}</h2>
            {deliveryMode === "shipping" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="rounded-xl"
              >
                {detectingLocation ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Detecting...</>
                ) : (
                  <><MapPin className="h-4 w-4 mr-2" />Use Current Location</>
                )}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input placeholder="Full Name *" value={name} onChange={e => setName(e.target.value)} className="rounded-xl h-12" />
            <Input placeholder="Phone (10 digits) *" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className="rounded-xl h-12" />
            {deliveryMode === "shipping" && (
              <>
                <Input placeholder="Address *" value={address} onChange={e => setAddress(e.target.value)} className="rounded-xl h-12 sm:col-span-2" />
                <Input placeholder="City *" value={city} onChange={e => setCity(e.target.value)} className="rounded-xl h-12" />
                <Input placeholder="PIN Code (6 digits) *" value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="rounded-xl h-12" />
              </>
            )}
          </div>
        </div>

        {/* Measurements */}
        <div className="bg-card rounded-2xl p-6 card-shadow">
          <h2 className="font-bold text-lg mb-2">Your Measurements</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your body measurements manually or upload a measurement sheet. The tailor will confirm before stitching.
          </p>
          <MeasurementForm value={measurements} onChange={setMeasurements} />
        </div>

        {/* Payment Method */}
        <div className="bg-card rounded-2xl p-6 card-shadow">
          <h2 className="font-bold text-lg mb-4">Payment Method</h2>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod("online")}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === "online" ? "border-accent bg-accent/5" : "border-border"
              }`}
            >
              <CreditCard className={`h-5 w-5 ${paymentMethod === "online" ? "text-accent" : "text-muted-foreground"}`} />
              <div className="text-left">
                <p className="font-semibold text-sm">Online Payment</p>
                <p className="text-xs text-muted-foreground">UPI, Card, Net Banking</p>
              </div>
              {paymentMethod === "online" && <Check className="h-5 w-5 text-accent ml-auto" />}
            </button>
            <button
              onClick={() => setPaymentMethod("cod")}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === "cod" ? "border-accent bg-accent/5" : "border-border"
              }`}
            >
              <Banknote className={`h-5 w-5 ${paymentMethod === "cod" ? "text-accent" : "text-muted-foreground"}`} />
              <div className="text-left">
                <p className="font-semibold text-sm">Cash on Delivery</p>
                <p className="text-xs text-muted-foreground">Pay when order arrives</p>
              </div>
              {paymentMethod === "cod" && <Check className="h-5 w-5 text-accent ml-auto" />}
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-card rounded-2xl p-6 card-shadow">
          <h2 className="font-bold text-lg mb-4">Order Summary</h2>
          {items.map(item => (
            <div key={item.service.id} className="flex justify-between text-sm py-2">
              <span className="text-muted-foreground">{item.service.name} × {item.quantity}</span>
              <span className="font-medium">₹{(item.service.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t mt-4 pt-4 flex justify-between font-bold text-xl">
            <span>Total</span>
            <span className="text-accent">₹{total.toLocaleString()}</span>
          </div>
          <Button variant="accent" className="w-full mt-6" size="xl" onClick={handlePlaceOrder} disabled={placing}>
            {placing ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />{paymentMethod === "online" ? "Processing Payment..." : "Placing Order..."}</>
            ) : (
              paymentMethod === "online" ? `Pay ₹${total.toLocaleString()}` : "Place Order (COD)"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
