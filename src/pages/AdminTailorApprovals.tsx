import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, MapPin, Store, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import StoresDebugPanel from "@/components/admin/StoresDebugPanel";
import { getProfileNameMap, listStores, liveStoreQueryOptions, updateStoreStatus } from "@/lib/stores";
import useStoresRealtime from "@/hooks/useStoresRealtime";

const AdminTailorApprovals = () => {
  const queryClient = useQueryClient();
  useStoresRealtime();

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores", "pending", "admin-approvals"],
    queryFn: async () => {
      const pendingStores = await listStores({ status: "pending" });
      const nameMap = await getProfileNameMap(pendingStores.map((store) => store.user_id));
      const results = pendingStores.map((store) => ({
        ...store,
        tailor_name: nameMap[store.user_id] || "Unknown Tailor",
      }));
      console.log("[stores] admin pending results", results);
      return results;
    },
    ...liveStoreQueryOptions,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      return updateStoreStatus(id, status);
    },
    onSuccess: async (_, vars) => {
      toast.success(vars.status === "approved" ? "Store approved!" : "Store rejected.");
      await queryClient.invalidateQueries({ queryKey: ["stores"] });
      await queryClient.refetchQueries({ queryKey: ["stores"], type: "active" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderCard = (store: any) => (
    <div key={store.id} className="bg-card rounded-2xl p-5 card-shadow flex flex-col sm:flex-row items-start sm:items-center gap-4">
      {store.image ? (
        <img src={store.image} alt={store.shop_name} className="h-16 w-16 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center shrink-0">
          <Store className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold">{store.shop_name}</p>
        <p className="text-sm text-muted-foreground">{store.tailor_name}</p>
        {store.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{store.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{store.location || "N/A"}</span>
          <span>{format(new Date(store.created_at), "dd MMM yyyy")}</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => updateMutation.mutate({ id: store.id, status: "approved" })}
          disabled={updateMutation.isPending}
        >
          <CheckCircle className="h-4 w-4 mr-1" /> Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateMutation.mutate({ id: store.id, status: "rejected" })}
          disabled={updateMutation.isPending}
        >
          <XCircle className="h-4 w-4 mr-1" /> Reject
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tailor Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve tailor stores</p>
      </div>

      <div className="mb-8">
        <StoresDebugPanel />
      </div>

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        Pending Approval ({stores.length})
      </h2>
      {stores.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 card-shadow text-center text-muted-foreground mb-8">
          No pending approvals
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((store: any) => renderCard(store))}
        </div>
      )}
    </div>
  );
};

export default AdminTailorApprovals;
