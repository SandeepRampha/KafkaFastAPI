import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveTopicRequest, rejectTopicRequest } from "../../services/adminService";
import { topicRequestKeys } from "../queries/useTopicRequests";
import { healthKeys } from "../queries/useHealth";

export function useApproveTopicRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => approveTopicRequest(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: topicRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}

export function useRejectTopicRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rejectTopicRequest(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: topicRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}
