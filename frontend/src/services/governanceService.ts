import api from "./api";
import type { PaginatedResponse } from "./adminService";

export const GovernanceResourceType = {
  TOPIC: "TOPIC",
  ACL: "ACL",
  SCHEMA: "SCHEMA"
} as const;
export type GovernanceResourceType = (typeof GovernanceResourceType)[keyof typeof GovernanceResourceType];

export const GovernanceOperation = {
  CREATE: "CREATE",
  ALTER: "ALTER",
  DELETE: "DELETE"
} as const;
export type GovernanceOperation = (typeof GovernanceOperation)[keyof typeof GovernanceOperation];

export const GovernanceStatus = {
  REQUESTED: "REQUESTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  IMPLEMENTED: "IMPLEMENTED",
  REJECTED: "REJECTED",
  IMPLEMENTATION_FAILED: "IMPLEMENTATION_FAILED"
} as const;
export type GovernanceStatus = (typeof GovernanceStatus)[keyof typeof GovernanceStatus];

export interface GovernanceRequest {
  id: string;
  resource_type: GovernanceResourceType;
  resource_name: string;
  operation: GovernanceOperation;
  payload: any;
  old_payload?: any;
  status: GovernanceStatus;
  created_by: string;
  approved_by?: string;
  implemented_by?: string;
  error_message?: string;
  admin_comment?: string;
  cluster_id: string;
  created_at: string;
  updated_at?: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  is_boolean: boolean;
  description?: string;
  updated_at?: string;
  updated_by?: string;
}

const governanceService = {
  // Requests
  fetchRequests: async (params: {
    resource_type?: GovernanceResourceType;
    operation?: GovernanceOperation;
    status?: GovernanceStatus;
    page?: number;
    page_size?: number;
  }) => {
    const response = await api.get<PaginatedResponse<GovernanceRequest>>("/governance/requests", { params });
    return response.data;
  },

  createRequest: async (data: {
    resource_type: GovernanceResourceType;
    resource_name: string;
    operation: GovernanceOperation;
    payload: any;
    old_payload?: any;
    cluster_id?: string;
  }) => {
    const response = await api.post<GovernanceRequest>("/governance/requests", data);
    return response.data;
  },

  approveRequest: async (id: string, admin_comment?: string) => {
    const response = await api.put<GovernanceRequest>(`/governance/requests/${id}/approve`, { admin_comment });
    return response.data;
  },

  rejectRequest: async (id: string, admin_comment?: string) => {
    const response = await api.put<GovernanceRequest>(`/governance/requests/${id}/reject`, { admin_comment });
    return response.data;
  },

  implementRequest: async (id: string) => {
    const response = await api.put<GovernanceRequest>(`/governance/requests/${id}/implement`, {});
    return response.data;
  },

  // Settings
  fetchSettings: async () => {
    const response = await api.get<SystemSetting[]>("/governance/settings");
    return response.data;
  },

  updateSetting: async (key: string, value: any, is_boolean: boolean = false) => {
    const response = await api.put<SystemSetting>(`/governance/settings/${key}`, { value, is_boolean });
    return response.data;
  }
};

export default governanceService;
