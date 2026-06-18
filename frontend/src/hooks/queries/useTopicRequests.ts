import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchTopicRequests, type TopicRequestResponse, type PaginatedResponse } from "../../services/adminService";
import { useAuth } from "../../contexts/AuthContext";

export const topicRequestKeys = {
  all: ["topic-requests"] as const,
  list: (cluster: string, page: number = 1, pageSize: number = 10, search?: string) => 
    [...topicRequestKeys.all, { cluster, page, pageSize, search }] as const,
};

export function useTopicRequests(
  cluster: string = "default",
  page: number = 1,
  pageSize: number = 10,
  search?: string
) {
  const { isAuthenticated } = useAuth();

  return useQuery<PaginatedResponse<TopicRequestResponse>>({
    queryKey: topicRequestKeys.list(cluster, page, pageSize, search),
    queryFn: ({ signal }) => fetchTopicRequests(cluster, page, pageSize, search, signal),
    placeholderData: keepPreviousData,
    staleTime: 30000,
    enabled: isAuthenticated,
  });
}
