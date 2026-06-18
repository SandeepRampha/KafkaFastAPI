import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveACLRequest, rejectACLRequest, type ACLRequest } from "../../services/adminService";
import { aclRequestsKeys } from "../queries/useACLRequests";
import { healthKeys } from "../queries/useHealth";

export function useApproveACLRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => approveACLRequest(id),
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: aclRequestsKeys.all });
      const previousRequests = queryClient.getQueryData<ACLRequest[]>(aclRequestsKeys.all);

      if (previousRequests) {
        queryClient.setQueryData<ACLRequest[]>(
          aclRequestsKeys.all,
          previousRequests.map((req) =>
            req.id === requestId ? { ...req, status: "APPROVED" } : req
          )
        );
      }

      return { previousRequests };
    },
    onError: (_err, _id, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(aclRequestsKeys.all, context.previousRequests);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: aclRequestsKeys.all });
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}

export function useRejectACLRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rejectACLRequest(id),
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: aclRequestsKeys.all });
      const previousRequests = queryClient.getQueryData<ACLRequest[]>(aclRequestsKeys.all);

      if (previousRequests) {
        queryClient.setQueryData<ACLRequest[]>(
          aclRequestsKeys.all,
          previousRequests.map((req) =>
            req.id === requestId ? { ...req, status: "REJECTED" } : req
          )
        );
      }

      return { previousRequests };
    },
    onError: (_err, _id, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(aclRequestsKeys.all, context.previousRequests);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: aclRequestsKeys.all });
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}
