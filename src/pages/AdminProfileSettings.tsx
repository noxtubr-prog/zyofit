import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Save, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

const AdminProfileSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim(), phone: phone.trim() }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated!");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account details</p>
      </div>

      <div className="bg-card rounded-2xl p-6 card-shadow space-y-5">
        <div className="flex items-center gap-4 p-4 bg-secondary rounded-xl">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-bold">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Full Name</label>
          <Input value={fullName} onChange={e => setFullName(e.target.value)} className="rounded-xl h-12" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Phone</label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} className="rounded-xl h-12" placeholder="+91 ..." />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Email</label>
          <Input value={user?.email || ""} disabled className="rounded-xl h-12 bg-secondary" />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default AdminProfileSettings;
