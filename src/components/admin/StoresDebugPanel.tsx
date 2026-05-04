import { useQuery } from "@tanstack/react-query";
import { getStoreCounts, liveStoreQueryOptions } from "@/lib/stores";

const StoresDebugPanel = () => {
  const { data: counts } = useQuery({
    queryKey: ["stores", "counts", "debug"],
    queryFn: getStoreCounts,
    ...liveStoreQueryOptions,
  });

  if (!counts) return null;

  return (
    <div className="bg-card rounded-2xl p-5 card-shadow border border-border/60">
      <p className="text-sm font-semibold text-foreground">Store Debug Panel</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <div className="rounded-xl bg-secondary/50 p-4">
          <p className="text-xs text-muted-foreground">Total stores</p>
          <p className="text-2xl font-bold text-foreground">{counts.total}</p>
        </div>
        <div className="rounded-xl bg-secondary/50 p-4">
          <p className="text-xs text-muted-foreground">Pending stores</p>
          <p className="text-2xl font-bold text-foreground">{counts.pending}</p>
        </div>
        <div className="rounded-xl bg-secondary/50 p-4">
          <p className="text-xs text-muted-foreground">Approved stores</p>
          <p className="text-2xl font-bold text-foreground">{counts.approved}</p>
        </div>
      </div>
    </div>
  );
};

export default StoresDebugPanel;