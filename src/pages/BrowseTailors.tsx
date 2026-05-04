import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, ArrowRight, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listStores, liveStoreQueryOptions } from "@/lib/stores";
import useStoresRealtime from "@/hooks/useStoresRealtime";
import MyStoreStatusBadge from "@/components/MyStoreStatusBadge";

const BrowseTailors = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  useStoresRealtime();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const { data: tailors = [], isLoading } = useQuery({
    queryKey: ["stores", "approved-marketplace"],
    queryFn: async () => {
      const data = await listStores({ status: "approved" });
      console.log("[stores] browse approved results", data);
      return data;
    },
    ...liveStoreQueryOptions,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return tailors;
    const q = search.toLowerCase();
    return tailors.filter((t: any) =>
      t.shop_name.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [search, tailors]);

  return (
    <div className="container py-10">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Browse Tailors</h1>
          <p className="text-muted-foreground mt-2 text-base">Find the perfect tailor for your custom clothing needs</p>
        </div>
        <MyStoreStatusBadge />
      </div>

      <div className="mb-8">
        <div className="relative max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tailor name or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl h-12 text-base"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No approved stores found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tailor: any) => (
              <div
                key={tailor.id}
                className="bg-card rounded-2xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 flex flex-col border border-transparent hover:border-primary/30"
              >
                {tailor.image ? (
                  <img
                    src={tailor.image}
                    alt={tailor.shop_name}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="h-40 w-full bg-secondary flex items-center justify-center">
                    <Store className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg">{tailor.shop_name}</h3>
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />{tailor.location}
                    </span>
                  </div>
                  {tailor.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{tailor.description}</p>
                  )}
                  <div className="flex items-center justify-end mt-auto pt-4">
                    <Link to={`/tailor/${tailor.id}`}>
                      <Button size="sm">
                        View Store <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default BrowseTailors;
