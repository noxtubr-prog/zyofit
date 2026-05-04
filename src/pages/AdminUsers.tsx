import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Store, ShieldCheck, Eye, MapPin, Package, Phone, Ban, RotateCcw, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

const maskPhone = (p?: string | null) => {
  if (!p) return "—";
  const digits = p.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `••••••${digits.slice(-4)}`;
};

const eventLabel: Record<string, string> = {
  login_success: "Logged in",
  login_failed: "Failed login",
  logout: "Logged out",
  password_reset_requested: "Reset requested",
  otp_sent: "OTP sent",
  otp_verified: "OTP verified",
  otp_failed: "OTP failed",
  suspended: "Suspended",
  reactivated: "Reactivated",
};

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [acting, setActing] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url, created_at, account_status")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");
      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

      return (profiles || []).map((p: any) => ({
        ...p,
        role: roleMap.get(p.id) || "customer",
      }));
    },
  });

  const { data: userDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ["admin-user-details", selectedUser?.id],
    enabled: !!selectedUser?.id,
    queryFn: async () => {
      const [ordersRes, activityRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, total_amount, created_at, delivery_address, delivery_city, delivery_pincode, delivery_phone, delivery_name")
          .eq("customer_id", selectedUser.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("login_activity")
          .select("id, event, created_at, ip_address, user_agent, metadata")
          .eq("user_id", selectedUser.id)
          .order("created_at", { ascending: false })
          .limit(15),
      ]);
      return { orders: ordersRes.data || [], activity: activityRes.data || [] };
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u: any) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
    );
  }, [search, users]);

  const setStatus = async (status: "active" | "suspended") => {
    if (!selectedUser) return;
    setActing(true);
    const { error } = await supabase.rpc("admin_set_account_status" as any, {
      p_user_id: selectedUser.id, p_status: status,
    });
    setActing(false);
    if (error) return toast({ title: "Action failed", description: error.message, variant: "destructive" });
    toast({ title: status === "suspended" ? "User suspended" : "User reactivated" });
    setSelectedUser({ ...selectedUser, account_status: status });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-user-details", selectedUser.id] });
  };

  const sendPasswordResetEmail = async () => {
    if (!selectedUser) return;
    const { data: u } = await supabase.auth.admin
      ? { data: null } : { data: null }; // admin auth not available client-side
    toast({
      title: "Password reset",
      description: "Ask the user to use 'Forgot password' on the login screen. Admins cannot view or set passwords.",
    });
  };

  const roleIcon = (role: string) => {
    if (role === "tailor") return <Store className="h-3.5 w-3.5" />;
    if (role === "admin") return <ShieldCheck className="h-3.5 w-3.5" />;
    return <Users className="h-3.5 w-3.5" />;
  };

  const roleBadgeVariant = (role: string) => {
    if (role === "admin") return "destructive" as const;
    if (role === "tailor") return "default" as const;
    return "secondary" as const;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">
          All registered platform users ({users.length}) • Phone numbers are masked for privacy
        </p>
      </div>

      <div className="mb-6 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, role, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 card-shadow text-center text-muted-foreground">
          No users found
        </div>
      ) : (
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user: any) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                          {user.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="font-medium">{user.full_name || "Unnamed"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">{maskPhone(user.phone)}</td>
                    <td className="p-4">
                      <Badge variant={roleBadgeVariant(user.role)} className="gap-1">
                        {roleIcon(user.role)}
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {user.account_status === "suspended" ? (
                        <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" /> Suspended</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600/30">Active</Badge>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {format(new Date(user.created_at), "dd MMM yyyy")}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)} className="rounded-xl">
                        <Eye className="h-4 w-4 mr-1.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!selectedUser} onOpenChange={(o) => !o && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedUser?.full_name || "User"}</DialogTitle>
            <DialogDescription>
              Sensitive details are visible only to admins. Passwords and OTPs are stored hashed and are never accessible.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Role</p>
                  <Badge variant={roleBadgeVariant(selectedUser.role)} className="gap-1">
                    {roleIcon(selectedUser.role)}
                    {selectedUser.role}
                  </Badge>
                </div>
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Phone className="h-3 w-3" />Phone</p>
                  <p className="font-mono text-sm break-all">{selectedUser.phone || "—"}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {selectedUser.account_status === "suspended" ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600/30">Active</Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedUser.account_status === "suspended" ? (
                  <Button size="sm" onClick={() => setStatus("active")} disabled={acting} className="rounded-xl">
                    <RotateCcw className="h-4 w-4" /> Reactivate
                  </Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={() => setStatus("suspended")} disabled={acting} className="rounded-xl">
                    <Ban className="h-4 w-4" /> Suspend
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={sendPasswordResetEmail} className="rounded-xl">
                  Password reset info
                </Button>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Recent activity
                </h3>
                {loadingDetails ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : (userDetails?.activity.length || 0) === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted/20 rounded-xl p-4">No activity yet</div>
                ) : (
                  <div className="space-y-1.5">
                    {userDetails!.activity.map((a: any) => (
                      <div key={a.id} className="text-xs flex items-center justify-between border rounded-lg px-3 py-2">
                        <span className="font-medium">{eventLabel[a.event] || a.event}</span>
                        <span className="text-muted-foreground">{format(new Date(a.created_at), "dd MMM HH:mm")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Orders ({userDetails?.orders.length || 0})
                </h3>
                {loadingDetails ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : (userDetails?.orders.length || 0) === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted/20 rounded-xl p-4">No orders yet</div>
                ) : (
                  <div className="space-y-2">
                    {userDetails!.orders.map((o: any) => (
                      <div key={o.id} className="border rounded-xl p-3 text-sm">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-semibold">{o.order_number}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd MMM yyyy, HH:mm")}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">{o.status}</Badge>
                            <p className="font-bold mt-1">₹{Number(o.total_amount).toLocaleString()}</p>
                          </div>
                        </div>
                        {o.delivery_address && (
                          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-start gap-1.5">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{o.delivery_address}, {o.delivery_city} – {o.delivery_pincode}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                🔒 Passwords are stored hashed (bcrypt) and never accessible. OTP codes are stored as SHA-256 hashes with expiry.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
