import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PhoneLogin = () => {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { toast } = useToast();

  const startCooldown = (s: number) => {
    setCooldown(s);
    const id = setInterval(() => setCooldown(v => (v <= 1 ? (clearInterval(id), 0) : v - 1)), 1000);
  };

  const sendOtp = async () => {
    if (!phone.startsWith("+")) return toast({ title: "Use international format (+91…)", variant: "destructive" });
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("send-phone-otp", { body: { phone, purpose: "login" } });
    setSubmitting(false);
    if (error || (data as any)?.error) return toast({ title: "Could not send code", description: (data as any)?.error || error?.message, variant: "destructive" });
    toast({ title: "Code sent" });
    setStep("otp");
    startCooldown(60);
  };

  const verifyOtp = async () => {
    if (code.length < 4) return toast({ title: "Enter the code", variant: "destructive" });
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("verify-phone-otp", { body: { phone, code, purpose: "login" } });
    setSubmitting(false);
    if (error || (data as any)?.error) return toast({ title: "Verification failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    const link = (data as any)?.action_link;
    if (!link) return toast({ title: "Login failed", description: "Missing session link", variant: "destructive" });
    window.location.href = link;
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-2xl accent-gradient flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Sign in with phone</h1>
          <p className="text-muted-foreground text-sm mt-1">We'll text you a one-time code.</p>
        </div>

        <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
          {step === "phone" ? (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="tel" placeholder="+919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl pl-10 h-12" />
                </div>
              </div>
              <Button className="w-full" onClick={sendOtp} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Code sent to {phone}. Expires in 5 min.</p>
              <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="rounded-xl h-12 tracking-widest text-center text-lg" />
              <Button className="w-full" onClick={verifyOtp} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={sendOtp} disabled={submitting || cooldown > 0}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhoneLogin;
