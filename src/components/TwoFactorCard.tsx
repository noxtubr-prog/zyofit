import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

// Authenticator-app (TOTP) two-factor enrollment & management.
// Uses Supabase MFA. Users scan a QR code, then verify a 6-digit code.
const TwoFactorCard = () => {
  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [pending, setPending] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) setFactors(data?.totp || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator" });
    setEnrolling(false);
    if (error) return toast.error(error.message);
    setPending({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const finishEnroll = async () => {
    if (!pending) return;
    setVerifying(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: pending.id });
    if (chErr) { setVerifying(false); return toast.error(chErr.message); }
    const { error } = await supabase.auth.mfa.verify({ factorId: pending.id, challengeId: ch.id, code: verifyCode });
    setVerifying(false);
    if (error) return toast.error(error.message);
    toast.success("Two-factor enabled");
    setPending(null); setVerifyCode("");
    refresh();
  };

  const removeFactor = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return toast.error(error.message);
    toast.success("Two-factor removed");
    refresh();
  };

  const verified = factors.filter((f: any) => f.status === "verified");

  return (
    <div className="bg-card rounded-2xl p-5 card-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h2 className="font-semibold">Two-factor authentication</h2>
        </div>
        {verified.length > 0 ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">Enabled</span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Off</span>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Add a second factor using an authenticator app (Google Authenticator, 1Password, Authy).
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : verified.length > 0 ? (
        <div className="space-y-2">
          {verified.map((f: any) => (
            <div key={f.id} className="flex items-center justify-between border rounded-xl p-3 text-sm">
              <div>
                <p className="font-medium">{f.friendly_name || "Authenticator"}</p>
                <p className="text-xs text-muted-foreground">Added {new Date(f.created_at).toLocaleDateString()}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => removeFactor(f.id)} className="rounded-xl">Remove</Button>
            </div>
          ))}
        </div>
      ) : pending ? (
        <div className="space-y-3">
          <div className="flex justify-center bg-white rounded-xl p-3">
            <img src={pending.qr} alt="2FA QR" className="h-44 w-44" />
          </div>
          <p className="text-xs text-muted-foreground text-center break-all">
            Or enter manually: <span className="font-mono">{pending.secret}</span>
          </p>
          <Input inputMode="numeric" maxLength={6} placeholder="6-digit code"
            value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
            className="rounded-xl h-11 text-center tracking-widest" />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setPending(null); setVerifyCode(""); }}>Cancel</Button>
            <Button className="flex-1" onClick={finishEnroll} disabled={verifying || verifyCode.length < 6}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & enable"}
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={startEnroll} disabled={enrolling}>
          {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldAlert className="h-4 w-4" /> Enable 2FA</>}
        </Button>
      )}
    </div>
  );
};

export default TwoFactorCard;
