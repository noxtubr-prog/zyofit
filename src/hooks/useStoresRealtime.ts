import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const useStoresRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("stores-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stores" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["stores"] });
          queryClient.refetchQueries({ queryKey: ["stores"], type: "active" });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

export default useStoresRealtime;