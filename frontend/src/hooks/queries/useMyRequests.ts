import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchMyRequests, type UnifiedRequest, type PaginatedResponse } from "../../services/adminService";
import { useAuth } from "../../contexts/AuthContext";

export const requestKeys = {
  all: ["my-requests"] as const,
  list: (cluster: string, page: number = 1, pageSize: number = 10, search?: string, resourceType?: string) => 
    [...requestKeys.all, { cluster, page, pageSize, search, resourceType }] as const,
};

export function useMyRequests(
  cluster: string = "default",
  page: number = 1,
  pageSize: number = 10,
  search?: string,
  resourceType?: string
) {
  const { isAuthenticated } = useAuth();

  return useQuery<PaginatedResponse<UnifiedRequest>>({
    queryKey: requestKeys.list(cluster, page, pageSize, search, resourceType),
    queryFn: ({ signal }) => fetchMyRequests(cluster, page, pageSize, search, signal, resourceType),
    placeholderData: keepPreviousData,
    staleTime: 30000,
    enabled: isAuthenticated,
  });
}
