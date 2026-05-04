import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Save, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const TailorProfileSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Store details
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tailorProfileId, setTailorProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, tailorRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("tailor_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (profileRes.data) {
        setFullName(profileRes.data.full_name || "");
        setPhone(profileRes.data.phone || "");
      }
      if (tailorRes.data) {
        setShopName(tailorRes.data.shop_name || "");
        setDescription(tailorRes.data.description || "");
        setExperience(String(tailorRes.data.experience || ""));
        setLocation(tailorRes.data.location || "");
        setImageUrl(tailorRes.data.image_url || "");
        setTailorProfileId(tailorRes.data.id);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error: profileError } = await supabase.from("profiles").update({ full_name: fullName.trim(), phone: phone.trim() }).eq("id", user.id);

    let storeError = null;
    if (tailorProfileId) {
      const { error } = await supabase.from("tailor_profiles").update({
        shop_name: shopName.trim(),
        description: description.trim(),
        experience: parseInt(experience) || 0,
        location: location.trim(),
        image_url: imageUrl.trim() || null,
      }).eq("id", tailorProfileId);
      storeError = error;
    }

    setSaving(false);

    if (profileError || storeError) toast.error("Failed to save some changes.");
    else toast.success("Profile updated!");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Update your personal and store info</p>
      </div>

      {/* Personal Info */}
      <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2"><User className="h-5 w-5" /> Personal Info</h2>
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
      </div>

      {/* Store Details */}
      {tailorProfileId && (
        <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
          <h2 className="text-lg font-bold">Store Details</h2>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Shop Name</label>
            <Input value={shopName} onChange={e => setShopName(e.target.value)} className="rounded-xl h-12" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Store Image URL</label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="rounded-xl h-12 pl-10" />
            </div>
            {imageUrl && <img src={imageUrl} alt="Preview" className="mt-3 h-32 w-full object-cover rounded-xl border" />}
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Experience (yrs)</label>
              <Input type="number" value={experience} onChange={e => setExperience(e.target.value)} className="rounded-xl h-12" min="0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Location</label>
              <Input value={location} onChange={e => setLocation(e.target.value)} className="rounded-xl h-12" />
            </div>
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save All Changes"}
      </Button>
    </div>
  );
};

export default TailorProfileSettings;
