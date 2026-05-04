import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, XCircle, Radio } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getStoreByUserId, liveStoreQueryOptions, type StoreStatus } from "@/lib/stores";
import useStoresRealtime from "@/hooks/useStoresRealtime";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

const STATUS_META: Record<StoreStatus, { label: string; Icon: typeof Clock; classes: string; pulse: string }> = {
  pending: {
    label: "Pending Approval",
    Icon: Clock,
    classes: "bg-secondary text-foreground border-border",
    pulse: "bg-muted-foreground",
  },
  approved: {
    label: "Approved",
    Icon: CheckCircle2,
    classes: "bg-accent/15 text-accent border-accent/30",
    pulse: "bg-accent",
  },
  rejected: {
    label: "Rejected",
    Icon: XCircle,
    classes: "bg-destructive/15 text-destructive border-destructive/30",
    pulse: "bg-destructive",
  },
};

const MyStoreStatusBadge = ({ className }: Props) => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  useStoresRealtime();

  // Visibility rule: only signed-in tailors. Customers + admins never see this badge.
  const isTailor = !!user && !roleLoading && role === "tailor";

  const { data: store } = useQuery({
    queryKey: ["stores", "mine", user?.id],
    queryFn: () => getStoreByUserId(user!.id),
    enabled: isTailor,
    ...liveStoreQueryOptions,
  });

  const status = store?.store_status as StoreStatus | undefined;
  const [flash, setFlash] = useState(false);
  const [prev, setPrev] = useState<StoreStatus | undefined>(status);

  useEffect(() => {
    if (status && prev && status !== prev) {
      console.log("[badge] store_status changed:", prev, "→", status);
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2200);
      return () => clearTimeout(t);
    }
    setPrev(status);
  }, [status, prev]);

  // Hide for non-tailors (customers, admins, signed-out) and tailors who haven't created a store yet.
  if (!isTailor || !store || !status) return null;

  const meta = STATUS_META[status];
  const Icon = meta.Icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm",
          meta.classes,
          flash && "ring-2 ring-accent/50 ring-offset-2 ring-offset-background",
          className,
        )}
        title="Live status — updates instantly when admin changes it"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", meta.pulse)} />
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", meta.pulse)} />
        </span>
        <Icon className="h-3.5 w-3.5" />
        <span>My store: {meta.label}</span>
        <Radio className="h-3 w-3 opacity-50" aria-hidden />
      </motion.div>
    </AnimatePresence>
  );
};

export default MyStoreStatusBadge;
