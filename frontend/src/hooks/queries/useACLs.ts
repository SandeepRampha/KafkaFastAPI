import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchACLs, type ACL, type PaginatedResponse } from "../../services/adminService";
import { useAuth } from "../../contexts/AuthContext";

export const aclKeys = {
  all: ["acls"] as const,
  list: (cluster: string, principal?: string, page: number = 1, pageSize: number = 10, search?: string) => 
    [...aclKeys.all, { cluster, principal, page, pageSize, search }] as const,
};

export function useACLs(
  cluster: string = "default",
  principal?: string,
  page: number = 1,
  pageSize: number = 10,
  search?: string
) {
  const { isAuthenticated } = useAuth();

  return useQuery<PaginatedResponse<ACL>>({
    queryKey: aclKeys.list(cluster, principal, page, pageSize, search),
    queryFn: ({ signal }) => fetchACLs(cluster, principal, page, pageSize, search, signal),
    placeholderData: keepPreviousData,
    staleTime: 30000,
    enabled: isAuthenticated,
  });
}
