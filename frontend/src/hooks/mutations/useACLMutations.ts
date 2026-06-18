import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createACL, deleteACL, type CreateACLRequest, type ACL, type PaginatedResponse } from "../../services/adminService";
import { aclKeys } from "../queries/useACLs";
import { healthKeys } from "../queries/useHealth";

export function useCreateACL() {
  const queryClient = useQueryClient();
  const cluster = "default";

  return useMutation({
    mutationFn: (data: CreateACLRequest) => createACL(data),
    onMutate: async (newACL) => {
      await queryClient.cancelQueries({ queryKey: aclKeys.list(cluster) });
      const previousData = queryClient.getQueryData<PaginatedResponse<ACL>>(aclKeys.list(cluster));

      if (previousData && previousData.items) {
        const optimisticACL: ACL = {
          principal: newACL.principal,
          resourceType: newACL.resource_type,
          resourceName: newACL.resource_name,
          patternType: newACL.pattern_type || "LITERAL",
          operation: newACL.operation,
          permissionType: newACL.permission_type,
          host: newACL.host || "*",
        };

        queryClient.setQueryData<PaginatedResponse<ACL>>(aclKeys.list(cluster), {
          ...previousData,
          items: [optimisticACL, ...previousData.items],
          total_count: previousData.total_count + 1,
        });
      }

      return { previousData };
    },
    onError: (_err, _newACL, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(aclKeys.list(cluster), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: aclKeys.all });
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}

export function useDeleteACL() {
  const queryClient = useQueryClient();
  const cluster = "default";

  return useMutation({
    mutationFn: (data: CreateACLRequest) => deleteACL(data),
    onMutate: async (deletedACL) => {
      await queryClient.cancelQueries({ queryKey: aclKeys.list(cluster) });
      const previousData = queryClient.getQueryData<PaginatedResponse<ACL>>(aclKeys.list(cluster));

      if (previousData && previousData.items) {
        queryClient.setQueryData<PaginatedResponse<ACL>>(
          aclKeys.list(cluster),
          {
            ...previousData,
            items: previousData.items.filter(
              (acl) =>
                !(
                  acl.principal === deletedACL.principal &&
                  acl.resourceName === deletedACL.resource_name &&
                  acl.operation === deletedACL.operation &&
                  acl.resourceType === deletedACL.resource_type
                )
            ),
            total_count: Math.max(0, previousData.total_count - 1),
          }
        );
      }

      return { previousData };
    },
    onError: (_err, _deletedACL, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(aclKeys.list(cluster), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: aclKeys.all });
      queryClient.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
}
