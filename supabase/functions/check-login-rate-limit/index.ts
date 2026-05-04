// Server-side login rate limiter: 5 attempts / 5 min per email, 15-min lockout.
// Called BEFORE attempting password sign-in; on failure the client also reports it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { email, action } = await req.json();
    const key = String(email || "").trim().toLowerCase();
    if (!key || !["check", "report_failure", "report_success"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 5 attempts in 5 minutes => lockout 15 min (we approximate by stretching window to 15min after threshold)
    if (action === "check" || action === "report_failure") {
      const { data: countRows } = await admin
        .from("auth_rate_limits")
        .select("attempted_at", { count: "exact", head: false })
        .eq("bucket", "login:email")
        .eq("key", key)
        .gte("attempted_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());
      const recent = countRows ?? [];
      const recentInWindow = recent.filter(r => new Date(r.attempted_at).getTime() > Date.now() - 5 * 60 * 1000).length;

      // If 5+ failures in last 15 min => locked
      if (recent.length >= 5) {
        const oldest = recent.reduce((m, r) => Math.min(m, new Date(r.attempted_at).getTime()), Date.now());
        const unlockAt = oldest + 15 * 60 * 1000;
        return new Response(JSON.stringify({ locked: true, unlock_at: new Date(unlockAt).toISOString(), recent_in_window: recentInWindow }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (action === "report_failure") {
        await admin.from("auth_rate_limits").insert({ bucket: "login:email", key });
      }
      return new Response(JSON.stringify({ locked: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // success: clear failure entries for this key
    await admin.from("auth_rate_limits").delete().eq("bucket", "login:email").eq("key", key);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("rate limit error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
