import { supabase } from "@/integrations/supabase/client";

export type StoreStatus = "pending" | "approved" | "rejected";

export interface StoreRecord {
  id: string;
  user_id: string;
  shop_name: string;
  location: string;
  description: string;
  image: string | null;
  store_status: StoreStatus;
  created_at: string;
}

export interface StoreCounts {
  total: number;
  pending: number;
  approved: number;
}

type StoreWritePayload = Omit<StoreRecord, "id" | "created_at">;

const storesTable = () => (supabase as any).from("stores");

export const liveStoreQueryOptions = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always" as const,
  refetchOnReconnect: "always" as const,
  refetchOnWindowFocus: true,
};

export async function getStoreCounts(): Promise<StoreCounts> {
  const [totalResult, pendingResult, approvedResult] = await Promise.all([
    storesTable().select("id", { count: "exact", head: true }),
    storesTable().select("id", { count: "exact", head: true }).eq("store_status", "pending"),
    storesTable().select("id", { count: "exact", head: true }).eq("store_status", "approved"),
  ]);

  const error = totalResult.error || pendingResult.error || approvedResult.error;
  if (error) throw error;

  const counts = {
    total: totalResult.count || 0,
    pending: pendingResult.count || 0,
    approved: approvedResult.count || 0,
  };

  console.log("[stores] counts", counts);
  return counts;
}

export async function listStores({ status, limit }: { status?: StoreStatus; limit?: number }) {
  let query = storesTable()
    .select("id, user_id, shop_name, location, description, image, store_status, created_at")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("store_status", status);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as StoreRecord[]) || [];
}

export async function getStoreByUserId(userId: string) {
  const { data, error } = await storesTable()
    .select("id, user_id, shop_name, location, description, image, store_status, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as StoreRecord | null) ?? null;
}

export async function getApprovedStoreById(storeId: string) {
  const { data, error } = await storesTable()
    .select("id, user_id, shop_name, location, description, image, store_status, created_at")
    .eq("id", storeId)
    .eq("store_status", "approved")
    .maybeSingle();

  if (error) throw error;
  return (data as StoreRecord | null) ?? null;
}

export async function createStore(payload: StoreWritePayload) {
  const { data, error } = await storesTable()
    .insert({ ...payload, store_status: "pending" })
    .select("id, user_id, shop_name, location, description, image, store_status, created_at")
    .single();

  if (error) throw error;
  return data as StoreRecord;
}

export async function updateStore(storeId: string, payload: Partial<StoreWritePayload>) {
  const { data, error } = await storesTable()
    .update(payload)
    .eq("id", storeId)
    .select("id, user_id, shop_name, location, description, image, store_status, created_at")
    .single();

  if (error) throw error;
  return data as StoreRecord;
}

export async function updateStoreStatus(storeId: string, status: StoreStatus) {
  const { data, error } = await storesTable()
    .update({ store_status: status })
    .eq("id", storeId)
    .select("id, user_id, shop_name, location, description, image, store_status, created_at")
    .single();

  if (error) throw error;
  console.log("[stores] approval update", data);
  return data as StoreRecord;
}

export async function getProfileNameMap(userIds: string[]) {
  if (userIds.length === 0) return {} as Record<string, string>;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  if (error) throw error;

  return Object.fromEntries((data || []).map((profile) => [profile.id, profile.full_name || "Unknown Tailor"]));
}