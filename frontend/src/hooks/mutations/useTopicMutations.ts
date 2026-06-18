import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTopic, alterTopic, deleteTopic, type CreateTopicRequest, type AlterTopicRequest, type Topic, type PaginatedResponse } from "../../services/adminService";
import { topicKeys } from "../queries/useTopics";
import { healthKeys } from "../queries/useHealth";

export function useCreateTopic() {
  const queryClient = useQueryClient();
  const cluster = "default";

  return useMutation({
    mutationFn: (data: CreateTopicRequest) => createTopic(data),
    onMutate: async (newTopic) => {
      await queryClient.cancelQueries({ queryKey: topicKeys.list(cluster) });
      const previousData = queryClient.getQueryData<PaginatedResponse<Topic>>(topicKeys.list(cluster));

      if (previousData && previousData.items) {
        const optimisticTopic: Topic = {
          name: newTopic.name,
          num_partitions: newTopic.num_partitions,
          replication_factor: newTopic.replication_factor,
          cleanup_policy: newTopic.cleanup_policy || "delete",
          retention_ms: newTopic.retention_ms,
          min_insync_replicas: newTopic.min_insync_replicas,
          partitions: Array(newTopic.num_partitions).fill({ isrs: [] }),
          is_internal: false,
        };

        queryClient.setQueryData<PaginatedResponse<Topic>>(topicKeys.list(cluster), {
          ...previousData,
          items: [optimisticTopic, ...previousData.items],
          total_count: previousData.total_count + 1,
        });
      }

      return { previousData };
    },
    onError: (_err, _newTopic, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(topicKeys.list(cluster), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: topicKeys.all });
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}

export function useAlterTopic() {
  const queryClient = useQueryClient();
  const cluster = "default";

  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: AlterTopicRequest }) => alterTopic(name, data),
    onMutate: async ({ name, data }) => {
      await queryClient.cancelQueries({ queryKey: topicKeys.list(cluster) });
      const previousData = queryClient.getQueryData<PaginatedResponse<Topic>>(topicKeys.list(cluster));

      if (previousData && previousData.items) {
        queryClient.setQueryData<PaginatedResponse<Topic>>(
          topicKeys.list(cluster),
          {
            ...previousData,
            items: previousData.items.map((t) =>
              t.name === name
                ? {
                    ...t,
                    num_partitions: data.num_partitions ?? t.num_partitions,
                    cleanup_policy: data.cleanup_policy ?? t.cleanup_policy,
                    retention_ms: data.retention_ms ?? t.retention_ms,
                    min_insync_replicas: data.min_insync_replicas ?? t.min_insync_replicas,
                    partitions: data.num_partitions 
                      ? Array(data.num_partitions).fill({ isrs: [] }) 
                      : t.partitions,
                  }
                : t
            )
          }
        );
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(topicKeys.list(cluster), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: topicKeys.all });
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  const cluster = "default";

  return useMutation({
    mutationFn: (name: string) => deleteTopic(name),
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: topicKeys.list(cluster) });
      const previousData = queryClient.getQueryData<PaginatedResponse<Topic>>(topicKeys.list(cluster));

      if (previousData && previousData.items) {
        queryClient.setQueryData<PaginatedResponse<Topic>>(
          topicKeys.list(cluster),
          {
            ...previousData,
            items: previousData.items.filter((t) => t.name !== name),
            total_count: Math.max(0, previousData.total_count - 1),
          }
        );
      }

      return { previousData };
    },
    onError: (_err, _name, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(topicKeys.list(cluster), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: topicKeys.all });
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}
