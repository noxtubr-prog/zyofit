import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, ArrowLeft, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart } from "lucide-react";
import { getApprovedStoreById, liveStoreQueryOptions } from "@/lib/stores";
import useStoresRealtime from "@/hooks/useStoresRealtime";

const TailorProfile = () => {
  const { id } = useParams();
  const { addItem } = useCart();
  const queryClient = useQueryClient();
  useStoresRealtime();

  const { data: tailor, isLoading } = useQuery({
    queryKey: ["stores", "public", id],
    queryFn: () => getApprovedStoreById(id!),
    enabled: !!id,
    ...liveStoreQueryOptions,
  });

  // Fetch services directly by store_id — single source of truth
  const { data: services = [] } = useQuery({
    queryKey: ["store-services-public", tailor?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("services")
        .select("*")
        .eq("store_id", tailor!.id)
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      console.log("[services] public fetch by store_id", { store_id: tailor!.id, count: data?.length });
      return data;
    },
    enabled: !!tailor?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Realtime: refresh services when the tailor adds/edits/removes them
  useEffect(() => {
    if (!tailor?.id) return;
    const channel = supabase
      .channel(`services-store-${tailor.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services", filter: `store_id=eq.${tailor.id}` },
        (payload) => {
          console.log("[services] realtime change", payload);
          queryClient.invalidateQueries({ queryKey: ["store-services-public", tailor.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tailor?.id, queryClient]);

  if (isLoading) {
    return (
      <div className="container py-20 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!tailor) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground text-lg">Tailor not found or not yet approved.</p>
        <Link to="/browse"><Button className="mt-6">Back to Tailors</Button></Link>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to Tailors
      </Link>

      {tailor.image ? (
        <img
          src={tailor.image}
          alt={tailor.shop_name}
          className="w-full h-48 md:h-64 object-cover rounded-2xl mb-6"
        />
      ) : (
        <div className="w-full h-48 md:h-64 bg-card rounded-2xl mb-6 flex items-center justify-center">
          <Store className="h-16 w-16 text-muted-foreground/20" />
        </div>
      )}

      <div className="bg-card rounded-2xl p-6 md:p-10 card-shadow mb-12">
        <h1 className="text-2xl md:text-3xl font-bold">{tailor.shop_name}</h1>
        <div className="flex flex-wrap items-center gap-5 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{tailor.location}</span>
        </div>
        {tailor.description && (
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">{tailor.description}</p>
        )}
      </div>

      <h2 className="text-2xl font-bold mb-6">Services</h2>
      {services.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 card-shadow text-center text-muted-foreground">
          No services available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service: any) => (
            <div key={service.id} className="bg-card rounded-2xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 flex flex-col border border-transparent hover:border-primary/30">
              {service.image_url && (
                <img src={service.image_url} alt={service.name} className="h-48 w-full object-cover" />
              )}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-base">{service.name}</h3>
                  <Badge variant="secondary" className="text-xs">{service.category}</Badge>
                </div>
                {service.description && (
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{service.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {service.estimated_days} days
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t">
                  <span className="text-xl font-bold">₹{Number(service.price).toLocaleString("en-IN")}</span>
                  <Button
                    size="sm"
                    onClick={() =>
                      addItem({
                        id: service.id,
                        name: service.name,
                        category: service.category,
                        price: Number(service.price),
                        description: service.description || "",
                        image: service.image_url || "",
                        tailorId: tailor.id,
                        tailorName: tailor.shop_name,
                        estimatedDays: service.estimated_days,
                      })
                    }
                  >
                    <ShoppingCart className="h-4 w-4" /> Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TailorProfile;
