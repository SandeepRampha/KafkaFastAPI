import { useQuery } from "@tanstack/react-query";
import { default as api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

export const healthKeys = {
  all: ["health"] as const,
};

export function useHealth() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return useQuery({
    queryKey: healthKeys.all,
    queryFn: async () => {
      const response = await api.get("/health");
      return response.data;
    },
    // Only fetch if user is an admin
    enabled: isAdmin,
    staleTime: 30000, // 30 seconds
  });
}
