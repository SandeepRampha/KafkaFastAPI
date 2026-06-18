import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchACLRequests, type ACLRequest, type PaginatedResponse } from "../../services/adminService";
import { useAuth } from "../../contexts/AuthContext";

export const aclRequestsKeys = {
  all: ["acl-requests"] as const,
  list: (cluster: string, page: number = 1, pageSize: number = 10, search?: string) => 
    [...aclRequestsKeys.all, { cluster, page, pageSize, search }] as const,
};

export function useACLRequests(
  cluster: string = "default",
  page: number = 1,
  pageSize: number = 10,
  search?: string
) {
  const { isAuthenticated } = useAuth();

  return useQuery<PaginatedResponse<ACLRequest>>({
    queryKey: aclRequestsKeys.list(cluster, page, pageSize, search),
    queryFn: ({ signal }) => fetchACLRequests(cluster, page, pageSize, search, signal),
    placeholderData: keepPreviousData,
    staleTime: 30000,
    enabled: isAuthenticated,
  });
}
