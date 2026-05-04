import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Store, Save, Clock, CheckCircle, XCircle, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { createStore, getStoreByUserId, liveStoreQueryOptions, updateStore } from "@/lib/stores";
import useStoresRealtime from "@/hooks/useStoresRealtime";

const TailorStore = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  useStoresRealtime();

  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["stores", "mine", user?.id],
    queryFn: () => getStoreByUserId(user!.id),
    enabled: !!user,
    ...liveStoreQueryOptions,
  });

  useEffect(() => {
    if (profile) {
      setShopName(profile.shop_name || "");
      setDescription(profile.description || "");
      setLocation(profile.location || "");
      setImageUrl(profile.image || "");
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!shopName.trim() || !location.trim()) {
        throw new Error("Shop name and location are required");
      }

      const basePayload = {
        shop_name: shopName.trim(),
        description: description.trim(),
        location: location.trim(),
        image: imageUrl.trim() || null,
      };

      if (profile) {
        // Preserve existing store_status — editing must NOT reset an approved store to pending
        const savedStore = await updateStore(profile.id, basePayload);
        console.log("[stores] Updated in DB. status:", savedStore.store_status, savedStore);
        return savedStore;
      }

      const savedStore = await createStore({
        ...basePayload,
        user_id: user!.id,
        store_status: "pending" as const,
      });
      console.log("[stores] Created in DB. status:", savedStore.store_status, savedStore);
      return savedStore;
    },
    onSuccess: async () => {
      toast.success(profile ? "Store updated!" : "Store created! Pending admin approval.");
      await queryClient.invalidateQueries({ queryKey: ["stores"] });
      await queryClient.refetchQueries({ queryKey: ["stores"], type: "active" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getStatusBadge = () => {
    if (!profile) return null;
    const status = profile.store_status || "pending";
    if (status === "approved") {
      return (
        <Badge className="bg-accent/20 text-accent border-accent/30">
          <CheckCircle className="h-3 w-3 mr-1" /> Approved
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" /> Rejected
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" /> Pending Approval
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Store</h1>
          <p className="text-muted-foreground mt-1">
            {profile ? "Update your store details" : "Create your tailor store"}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {!profile && (
        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-5 mb-8">
          <p className="text-sm text-foreground">
            <Store className="h-4 w-4 inline mr-1.5" />
            Create your store to start accepting orders. Your store will be reviewed by our team before going live.
          </p>
        </div>
      )}

      <div className="bg-card rounded-2xl p-6 card-shadow space-y-5">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Shop Name *</label>
          <Input
            placeholder="e.g. Anita's Boutique"
            value={shopName}
            onChange={e => setShopName(e.target.value)}
            className="rounded-xl h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Shop Banner Image URL</label>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="https://example.com/banner.jpg"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="rounded-xl h-12 pl-10"
            />
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="Preview" className="mt-3 h-32 w-full object-cover rounded-xl border" />
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Description</label>
          <Textarea
            placeholder="Tell customers about your expertise, specialties, and what makes your work unique..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className="rounded-xl"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Location *</label>
          <Input
            placeholder="e.g. Lajpat Nagar, Delhi"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="rounded-xl h-12"
          />
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending
            ? "Saving..."
            : profile
            ? "Update Store"
            : "Create Store"}
        </Button>
      </div>
    </div>
  );
};

export default TailorStore;
