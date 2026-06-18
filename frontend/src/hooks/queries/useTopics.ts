import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchTopics, type Topic, type PaginatedResponse } from "../../services/adminService";
import { useAuth } from "../../contexts/AuthContext";

export const topicKeys = {
  all: ["topics"] as const,
  list: (cluster: string, page: number = 1, pageSize: number = 10, search?: string) => 
    [...topicKeys.all, { cluster, page, pageSize, search }] as const,
};

export function useTopics(
  cluster: string = "default",
  page: number = 1,
  pageSize: number = 10,
  search?: string
) {
  const { isAuthenticated } = useAuth();

  return useQuery<PaginatedResponse<Topic>>({
    queryKey: topicKeys.list(cluster, page, pageSize, search),
    queryFn: ({ signal }) => fetchTopics(cluster, page, pageSize, search, signal),
    placeholderData: keepPreviousData,
    staleTime: 30000, // 30 seconds
    enabled: isAuthenticated,
  });
}
