import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, IndianRupee, Clock } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Women", "Men", "Unisex"];

interface ServiceForm {
  name: string;
  description: string;
  price: string;
  category: string;
  estimated_days: string;
  image_url: string;
}

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  price: "",
  category: "Unisex",
  estimated_days: "7",
  image_url: "",
};

const TailorServices = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  // Fetch tailor's store (single source of truth for service linkage)
  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stores")
        .select("id, user_id, store_status")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      console.log("[services] tailor store lookup", data);
      return data as { id: string; user_id: string; store_status: string } | null;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: tailorProfile } = useQuery({
    queryKey: ["tailor-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tailor_profiles")
        .select("id, is_approved")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["tailor-services", store?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("services")
        .select("*")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      console.log("[services] tailor fetch by store_id", { store_id: store!.id, count: data?.length });
      return data;
    },
    enabled: !!store?.id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.price) throw new Error("Name and price are required");
      if (!store) throw new Error("Please create your store first");
      if (!tailorProfile) throw new Error("Tailor profile missing — please complete onboarding");

      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        category: form.category,
        estimated_days: parseInt(form.estimated_days) || 7,
        image_url: form.image_url.trim() || null,
        tailor_profile_id: tailorProfile.id,
        store_id: store.id,
      };

      console.log("[services] saving with store_id", store.id, payload);

      if (editingId) {
        const { error } = await (supabase as any).from("services").update(payload).eq("id", editingId);
        if (error) throw error;
        console.log("[services] updated", editingId);
      } else {
        const { data, error } = await (supabase as any).from("services").insert(payload).select().single();
        if (error) throw error;
        console.log("[services] created ✓", data);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Service updated!" : "Service added!");
      setShowDialog(false);
      setEditingId(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["tailor-services"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service deleted");
      queryClient.invalidateQueries({ queryKey: ["tailor-services"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (service: any) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description || "",
      price: String(service.price),
      category: service.category,
      estimated_days: String(service.estimated_days),
      image_url: service.image_url || "",
    });
    setShowDialog(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  if (!store) {
    return (
      <div className="bg-card rounded-2xl p-10 card-shadow text-center">
        <p className="text-muted-foreground">Please create your store first before adding services.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground mt-1">Manage your stitching services</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 card-shadow text-center">
          <p className="text-muted-foreground">No services yet. Add your first service to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <div key={service.id} className="bg-card rounded-2xl p-5 card-shadow border border-transparent hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-base">{service.name}</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">{service.category}</Badge>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Delete this service?")) deleteMutation.mutate(service.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {service.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{service.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 font-bold">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {Number(service.price).toLocaleString("en-IN")}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {service.estimated_days} days
                </span>
                <Badge variant={service.is_active ? "default" : "secondary"} className="ml-auto text-xs">
                  {service.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Service Name *</label>
              <Input
                placeholder="e.g. Blouse Stitching"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="rounded-xl h-12"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                placeholder="Describe this service..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Price (₹) *</label>
                <Input
                  type="number"
                  placeholder="500"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  className="rounded-xl h-12"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Estimated Days</label>
                <Input
                  type="number"
                  placeholder="7"
                  value={form.estimated_days}
                  onChange={e => setForm({ ...form, estimated_days: e.target.value })}
                  className="rounded-xl h-12"
                  min="1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Category</label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Image URL</label>
              <Input
                placeholder="https://example.com/service.jpg"
                value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                className="rounded-xl h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TailorServices;
