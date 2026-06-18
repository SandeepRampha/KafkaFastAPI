import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import toast from "react-hot-toast";
import axios from "axios";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Don't show toast for cancelled requests or circuit breaker blocks
      if (axios.isCancel(error)) return;

      console.error(`Query Error:`, error);
      toast.error(`Failed to load data: ${error.message}`);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error(`Mutation Error:`, error);
      toast.error(`Action failed: ${error.message}`);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error: any) => {
        if (failureCount >= 3) return false;

        const status = error?.response?.status;
        // Don't retry on 401 (Auth), 403 (Forbidden), or 404 (Not Found)
        if (status === 401 || status === 403 || status === 404) return false;

        // Don't retry on persistent 503 Service Unavailable unless it might be transient
        if (status === 503 && failureCount > 0) return false;

        // Don't retry cancelled requests
        if (error?.code === "ERR_CANCELED") return false;

        // Exponential backoff is handled by React Query default if we return true
        return true;
      },
      refetchOnWindowFocus: false, // UI Stability: Don't refetch on every tab switch
      refetchOnReconnect: true,    // Production Best Practice: Auto-recover when network returns
    },
  },
});
