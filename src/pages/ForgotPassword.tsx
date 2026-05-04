import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Mail, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Method = "email" | "phone";

const ForgotPassword = () => {
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const startCooldown = (s: number) => {
    setCooldown(s);
    const id = setInterval(() => {
      setCooldown((v) => {
        if (v <= 1) { clearInterval(id); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const sendEmail = async () => {
    if (!email.trim()) return toast({ title: "Enter your email", variant: "destructive" });
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) return toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    toast({ title: "Check your inbox", description: "We sent you a password reset link." });
    startCooldown(60);
  };

  const sendPhoneOtp = async () => {
    if (!phone.startsWith("+")) return toast({ title: "Use international format", description: "e.g. +91…", variant: "destructive" });
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("send-phone-otp", {
      body: { phone, purpose: "password_reset" },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      return toast({ title: "Could not send code", description: (data as any)?.error || error?.message, variant: "destructive" });
    }
    toast({ title: "Code sent", description: "Check your SMS." });
    setStep("verify");
    startCooldown(60);
  };

  const verifyPhoneOtp = async () => {
    if (code.length < 4) return toast({ title: "Enter the code", variant: "destructive" });
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
      body: { phone, code, purpose: "password_reset" },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      return toast({ title: "Invalid code", description: (data as any)?.error || error?.message, variant: "destructive" });
    }
    const link = (data as any)?.action_link;
    if (link) window.location.href = link;
    else navigate("/reset-password");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-2xl accent-gradient flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Forgot password</h1>
          <p className="text-muted-foreground text-sm mt-1">Reset via email or phone OTP</p>
        </div>

        <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={method === "email" ? "default" : "outline"} onClick={() => { setMethod("email"); setStep("request"); }} className="rounded-xl">
              <Mail className="h-4 w-4" /> Email
            </Button>
            <Button variant={method === "phone" ? "default" : "outline"} onClick={() => { setMethod("phone"); setStep("request"); }} className="rounded-xl">
              <Phone className="h-4 w-4" /> Phone
            </Button>
          </div>

          {method === "email" && (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl h-12" />
              </div>
              <Button className="w-full" onClick={sendEmail} disabled={submitting || cooldown > 0}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : cooldown > 0 ? `Resend in ${cooldown}s` : "Send reset link"}
              </Button>
            </>
          )}

          {method === "phone" && step === "request" && (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone (E.164)</label>
                <Input type="tel" placeholder="+919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl h-12" />
              </div>
              <Button className="w-full" onClick={sendPhoneOtp} disabled={submitting || cooldown > 0}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : cooldown > 0 ? `Resend in ${cooldown}s` : "Send OTP"}
              </Button>
            </>
          )}

          {method === "phone" && step === "verify" && (
            <>
              <p className="text-sm text-muted-foreground">Code sent to {phone}. Valid for 5 minutes.</p>
              <div>
                <label className="text-sm font-medium mb-1.5 block">6-digit code</label>
                <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="rounded-xl h-12 tracking-widest text-center text-lg" />
              </div>
              <Button className="w-full" onClick={verifyPhoneOtp} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & continue"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={sendPhoneOtp} disabled={submitting || cooldown > 0}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
