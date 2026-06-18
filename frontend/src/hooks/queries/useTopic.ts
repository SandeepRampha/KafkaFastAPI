import { useQuery } from "@tanstack/react-query";
import { fetchTopic, type Topic } from "../../services/adminService";
import { useAuth } from "../../contexts/AuthContext";

export const topicKeys = {
  all: ["topics"] as const,
  detail: (topicName: string, cluster: string) => [...topicKeys.all, "detail", { topicName, cluster }] as const,
};

export function useTopic(topicName: string, cluster: string = "default") {
  const { isAuthenticated } = useAuth();

  return useQuery<Topic>({
    queryKey: topicKeys.detail(topicName, cluster),
    queryFn: () => fetchTopic(topicName, cluster),
    enabled: !!topicName && isAuthenticated,
  });
}
