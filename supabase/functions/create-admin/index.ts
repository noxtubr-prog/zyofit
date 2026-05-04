import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if admin already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const adminExists = existingUsers?.users?.find(
    (u: any) => u.email === "admin@zylofit.com"
  );

  if (adminExists) {
    // Ensure role is set
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminExists.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "admin") {
      await supabase.from("user_roles").upsert(
        { user_id: adminExists.id, role: "admin" },
        { onConflict: "user_id" }
      );
    }

    return new Response(JSON.stringify({ message: "Admin already exists", id: adminExists.id }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create admin user
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email: "admin@zylofit.com",
    password: "Admin@123",
    email_confirm: true,
    user_metadata: { full_name: "ZyloFit Admin", role: "admin" },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ message: "Admin created", id: newUser.user.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
