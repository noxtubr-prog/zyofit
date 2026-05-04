// Sends an OTP via Twilio SMS for phone-based login or password reset.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

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

function normalizeSenderPhone(p: string) {
  const candidate = p.trim().match(/\+?\d[\d\s\-().]{7,20}/)?.[0] || "";
  const cleaned = candidate.replace(/[\s\-().]/g, "");
  const withPlus = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
  if (!/^\+\d{8,15}$/.test(withPlus)) return null;
  return withPlus;
}

async function resolveTwilioSender(lovableApiKey: string, twilioApiKey: string) {
  const configured = Deno.env.get("TWILIO_FROM_NUMBER") || "";
  const normalizedConfigured = normalizeSenderPhone(configured);
  console.log("Twilio sender config check", {
    configuredLength: configured.length,
    hasConfiguredDigits: /\d/.test(configured),
    normalizedConfigured: Boolean(normalizedConfigured),
  });
  if (normalizedConfigured) return normalizedConfigured;

  const numbersResp = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=20`, {
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": twilioApiKey,
    },
  });
  const numbersData = await numbersResp.json().catch(() => ({}));
  if (!numbersResp.ok) {
    throw new Error(`Unable to verify Twilio sender number [${numbersResp.status}]`);
  }

  const numbers = Array.isArray(numbersData?.incoming_phone_numbers) ? numbersData.incoming_phone_numbers : [];
  console.log("Twilio sender account lookup", {
    numbersCount: numbers.length,
    firstNumberSmsCapable: Boolean(numbers[0]?.capabilities?.sms),
    firstNumberNormalizable: Boolean(normalizeSenderPhone(String(numbers[0]?.phone_number || ""))),
  });
  const smsCapable = numbers.find((number: { phone_number?: string; capabilities?: { sms?: boolean } }) =>
    number?.capabilities?.sms === true && normalizeSenderPhone(String(number.phone_number || ""))
  );
  const fallback = smsCapable || numbers.find((number: { phone_number?: string }) => normalizeSenderPhone(String(number.phone_number || "")));
  const sender = normalizeSenderPhone(String(fallback?.phone_number || ""));
  if (!sender) {
    throw new Error("No valid SMS sender number found in the connected Twilio account. Add an SMS-capable Twilio phone number or update TWILIO_FROM_NUMBER.");
  }
  return sender;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, purpose } = await req.json();
    const normalized = normalizePhone(String(phone || ""));
    if (!normalized) {
      return new Response(JSON.stringify({ error: "Invalid phone (use E.164, e.g. +9198...)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["login", "password_reset"].includes(purpose)) {
      return new Response(JSON.stringify({ error: "Invalid purpose" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      return new Response(JSON.stringify({ error: "Twilio not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const TWILIO_FROM = await resolveTwilioSender(LOVABLE_API_KEY, TWILIO_API_KEY);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Rate limit: 3 sends / 5 min per phone
    const { data: ok, error: rlErr } = await admin.rpc("check_and_record_rate_limit", {
      p_bucket: "otp_send:phone", p_key: normalized, p_window_seconds: 300, p_max_attempts: 3,
    });
    if (rlErr) console.error("rate limit error", rlErr);
    if (ok === false) {
      return new Response(JSON.stringify({ error: "Too many OTP requests. Please wait a few minutes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit OTP, store hash only
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otp_hash = await sha256(otp);

    // Invalidate previous unused OTPs for same phone+purpose
    await admin.from("phone_otps").update({ used_at: new Date().toISOString() })
      .eq("phone", normalized).eq("purpose", purpose).is("used_at", null);

    const { error: insErr } = await admin.from("phone_otps").insert({
      phone: normalized, otp_hash, purpose,
    });
    if (insErr) throw insErr;

    // Send SMS
    const body = new URLSearchParams({
      To: normalized,
      From: TWILIO_FROM,
      Body: `Your ZyloFit verification code is ${otp}. It expires in 5 minutes. Never share this code.`,
    });
    const twResp = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const twData = await twResp.json();
    if (!twResp.ok) {
      console.error("Twilio error", twResp.status, twData);
      return new Response(JSON.stringify({ error: "Failed to send SMS", details: twData?.message || twData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, expires_in_seconds: 300 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-phone-otp error", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
