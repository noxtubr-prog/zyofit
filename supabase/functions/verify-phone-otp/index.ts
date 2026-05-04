// Verifies a phone OTP. For 'login' purpose, returns a one-time magic-link token
// (handled by Supabase admin generateLink) so the client can complete sign-in.
// For 'password_reset', returns a short-lived recovery link to /reset-password.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(p: string) {
  const trimmed = p.trim().replace(/\s|-/g, "");
  if (!trimmed.startsWith("+")) return null;
  if (!/^\+\d{8,15}$/.test(trimmed)) return null;
  return trimmed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, code, purpose } = await req.json();
    const normalized = normalizePhone(String(phone || ""));
    if (!normalized || !code || !["login", "password_reset"].includes(purpose)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Rate limit verifications
    const { data: ok } = await admin.rpc("check_and_record_rate_limit", {
      p_bucket: "otp_verify:phone", p_key: normalized, p_window_seconds: 300, p_max_attempts: 10,
    });
    if (ok === false) {
      return new Response(JSON.stringify({ error: "Too many attempts. Try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find latest unused OTP for this phone + purpose
    const { data: rows, error: selErr } = await admin
      .from("phone_otps")
      .select("id, otp_hash, attempts, expires_at, used_at")
      .eq("phone", normalized)
      .eq("purpose", purpose)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (selErr) throw selErr;
    const otpRow = rows?.[0];
    if (!otpRow) {
      return new Response(JSON.stringify({ error: "No active code. Please request a new one." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Code expired. Please request a new one." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (otpRow.attempts >= 3) {
      await admin.from("phone_otps").update({ used_at: new Date().toISOString() }).eq("id", otpRow.id);
      return new Response(JSON.stringify({ error: "Too many failed attempts. Request a new code." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidate = await sha256(String(code));
    if (candidate !== otpRow.otp_hash) {
      await admin.from("phone_otps").update({ attempts: otpRow.attempts + 1 }).eq("id", otpRow.id);
      return new Response(JSON.stringify({ error: "Incorrect code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark used
    await admin.from("phone_otps").update({ used_at: new Date().toISOString() }).eq("id", otpRow.id);

    // Find the user by phone
    // Search profiles.phone first
    const { data: profileRow } = await admin.from("profiles").select("id").eq("phone", normalized).maybeSingle();
    let userId = profileRow?.id as string | undefined;
    let email: string | undefined;
    if (userId) {
      const { data: u } = await admin.auth.admin.getUserById(userId);
      email = u?.user?.email ?? undefined;
    }

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "No account found for this phone number" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block suspended accounts
    const { data: prof } = await admin.from("profiles").select("account_status").eq("id", userId).maybeSingle();
    if (prof?.account_status === "suspended") {
      return new Response(JSON.stringify({ error: "Account suspended. Contact support." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";

    if (purpose === "login") {
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink", email,
        options: { redirectTo: origin || undefined },
      });
      if (linkErr) throw linkErr;
      await admin.rpc("log_user_activity", {
        p_user_id: userId, p_email: email, p_event: "otp_verified",
        p_ip: null, p_user_agent: req.headers.get("user-agent"), p_metadata: { method: "phone" },
      });
      return new Response(JSON.stringify({ success: true, action_link: link.properties?.action_link }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // password_reset
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery", email,
      options: { redirectTo: `${origin}/reset-password` },
    });
    if (linkErr) throw linkErr;
    await admin.rpc("log_user_activity", {
      p_user_id: userId, p_email: email, p_event: "password_reset_requested",
      p_ip: null, p_user_agent: req.headers.get("user-agent"), p_metadata: { method: "phone" },
    });
    return new Response(JSON.stringify({ success: true, action_link: link.properties?.action_link }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-phone-otp error", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
