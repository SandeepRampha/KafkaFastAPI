import axios from "axios";
import api from "./api";

export interface ACL {
    resourceType: string;
    resourceName: string;
    patternType: string;
    principal: string;
    host: string;
    operation: string;
    permissionType: string;
}

interface ACLResponse {
    resource_type: string;
    resource_name: string;
    pattern_type: string;
    principal: string;
    host: string;
    operation: string;
    permission_type: string;
}

export interface CreateACLRequest {
    resource_type: string;
    resource_name: string;
    principal: string;
    operation: string;
    permission_type: string;
    pattern_type?: string;
    host?: string;
    cluster?: string;
}

export interface Topic {
    name: string;
    num_partitions: number;
    replication_factor: number;
    cleanup_policy: string;
    retention_ms?: number;
    min_insync_replicas?: number;
    partitions: { isrs: any[] }[];
    extra_configs?: { [key: string]: string };
    config?: { [key: string]: string };
    is_internal: boolean;
}

export interface CreateTopicRequest {
    name: string;
    num_partitions: number;
    replication_factor: number;
    retention_ms: number;
    cleanup_policy: string;
    min_insync_replicas: number;
    extra_configs?: Record<string, string | number>;
}

export interface AlterTopicRequest {
    num_partitions: number;
    retention_ms: number;
    cleanup_policy: string;
    min_insync_replicas: number;
    extra_configs?: Record<string, string | number>;
}

export const fetchACLs = async (
    cluster: string = "default",
    principal?: string,
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    signal?: AbortSignal
): Promise<PaginatedResponse<ACL>> => {
    try {
        const params = new URLSearchParams({
            cluster,
            page: page.toString(),
            page_size: pageSize.toString(),
        });
        if (principal) params.append("principal", principal);
        if (search) params.append("search", search);

        const response = await api.get<PaginatedResponse<ACLResponse>>(`/acls/?${params.toString()}`, { signal });

        return {
            ...response.data,
            items: response.data.items.map((acl) => ({
                resourceType: acl.resource_type,
                resourceName: acl.resource_name,
                patternType: acl.pattern_type,
                principal: acl.principal,
                host: acl.host,
                operation: acl.operation,
                permissionType: acl.permission_type,
            })),
        };
    } catch (error) {
        if (!axios.isCancel(error)) {
            console.error("Failed to fetch ACLs:", error);
        }
        throw error;
    }
};

export const createACL = async (data: CreateACLRequest): Promise<any> => {
    const params = new URLSearchParams();
    params.append("resource_type", data.resource_type);
    params.append("resource_name", data.resource_name);
    params.append("principal", data.principal);
    params.append("operation", data.operation);
    params.append("permission_type", data.permission_type);
    params.append("cluster", data.cluster || "default");

    if (data.pattern_type) params.append("pattern_type", data.pattern_type);
    if (data.host) params.append("host", data.host);

    try {
        const response = await api.post(`/acls/?${params.toString()}`, {});
        return response.data;
    } catch (error) {
        console.error("Failed to create ACL:", error);
        throw error;
    }
};

export const deleteACL = async (data: CreateACLRequest): Promise<any> => {
    const params = new URLSearchParams();
    params.append("resource_type", data.resource_type);
    params.append("resource_name", data.resource_name);
    params.append("principal", data.principal);
    params.append("operation", data.operation);
    params.append("permission_type", data.permission_type);
    params.append("cluster", data.cluster || "default"); // Assuming default cluster if not provided

    if (data.pattern_type) params.append("pattern_type", data.pattern_type);
    if (data.host) params.append("host", data.host);

    try {
        const response = await api.delete(`/acls/?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Failed to delete ACL:", error);
        throw error;
    }
};

// ACL Requests
export interface ACLRequest {
    id: number;
    username: string;
    status: string;
    created_at: string;
    approved_by: string | null;
    kafka_operation: string;
    permission_type: string;
    pattern_type: string;
    resource_type: string;
    resource_name: string;
    principal: string;
    host: string;
    request_type: string;
}

export const fetchACLRequests = async (
    cluster: string = "default",
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    signal?: AbortSignal
): Promise<PaginatedResponse<ACLRequest>> => {
    try {
        const params: any = { cluster, page, page_size: pageSize };
        if (search) params.search = search;
        const response = await api.get<PaginatedResponse<ACLRequest>>("/acl-requests/", { params, signal });
        return response.data;
    } catch (error) {
        if (!axios.isCancel(error)) {
            console.error("Failed to fetch ACL requests:", error);
        }
        throw error;
    }
};

// Unified User Requests
export interface UnifiedRequest {
    id: number;
    request_type: string;
    username: string;
    operation: string;
    resource_name: string;
    status: string;
    created_at: string;
    updated_at: string | null;
    approved_by: string | null;
    num_partitions?: number;
    replication_factor?: number;
    cluster?: string;
}

export const fetchMyRequests = async (
    cluster: string = "default",
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    signal?: AbortSignal,
    resourceType?: string
): Promise<PaginatedResponse<UnifiedRequest>> => {
    try {
        const params: any = { cluster, page, page_size: pageSize };
        if (search) params.search = search;
        if (resourceType) params.resource_type = resourceType;
        
        // Use unified governance endpoint which covers all Topic and ACL requests
        const response = await api.get<PaginatedResponse<any>>("/governance/requests", { params, signal });
        
        return {
            ...response.data,
            items: response.data.items.map((req: any) => ({
                ...req,
                request_type: req.resource_type, // Map resource_type (TOPIC, ACL) to request_type
                // resource_name is already present in governance schema
            }))
        };
    } catch (error) {
        if (!axios.isCancel(error)) {
            console.error("Failed to fetch user requests:", error);
        }
        throw error;
    }
};

// Topic Requests
export interface TopicRequestResponse {
    id: number;
    username: string;
    operation: string;
    topic_name: string;
    num_partitions: number;
    replication_factor: number;
    retention_ms?: number;
    cleanup_policy: string;
    min_insync_replicas?: number;
    extra_configs?: Record<string, any> | null;
    config?: Record<string, any> | null;
    cluster: string;
    status: string;
    created_at: string;
    updated_at: string | null;
    approved_by: string | null;
    existing_config?: Topic | null;
}

export const fetchTopicRequests = async (
    cluster: string = "default",
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    signal?: AbortSignal
): Promise<PaginatedResponse<TopicRequestResponse>> => {
    try {
        const params: any = { cluster, page, page_size: pageSize };
        if (search) params.search = search;
        const response = await api.get<PaginatedResponse<TopicRequestResponse>>("/topic-requests/", { params, signal });
        return response.data;
    } catch (error: any) {
        if (!axios.isCancel(error)) {
            console.error("Failed to fetch topic requests:", error);
        }
        throw error;
    }
};

// Topic Operations

export interface PaginatedResponse<T> {
    items: T[];
    total_count: number;
    page: number;
    page_size: number;
    pages: number;
}

export const fetchTopics = async (
    cluster: string = "default",
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    signal?: AbortSignal
): Promise<PaginatedResponse<Topic>> => {
    try {
        const params = new URLSearchParams({
            cluster,
            page: page.toString(),
            page_size: pageSize.toString(),
        });
        if (search) params.append("search", search);

        const response = await api.get<PaginatedResponse<Topic>>(`/topics/metadata?${params.toString()}`, { signal });
        return response.data;
    } catch (error) {
        if (!axios.isCancel(error)) {
            console.error("Failed to fetch topics:", error);
        }
        throw error;
    }
};

export const fetchTopic = async (topicName: string, cluster: string = "default"): Promise<Topic> => {
    try {
        const response = await api.get<Topic>(`/topics/${topicName}?cluster=${cluster}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch topic ${topicName}:`, error);
        throw error;
    }
};

export const createTopic = async (data: CreateTopicRequest): Promise<any> => {
    try {
        const response = await api.post("/topics/", data);
        return response.data;
    } catch (error) {
        console.error("Failed to create topic:", error);
        throw error;
    }
};

export const alterTopic = async (topicName: string, data: AlterTopicRequest): Promise<any> => {
    try {
        const response = await api.put(`/topics/${topicName}`, data);
        return response.data;
    } catch (error) {
        console.error("Failed to alter topic:", error);
        throw error;
    }
};

export const deleteTopic = async (topicName: string): Promise<any> => {
    try {
        const response = await api.delete(`/topics/${topicName}`);
        return response.data;
    } catch (error) {
        console.error("Failed to delete topic:", error);
        throw error;
    }
};
export const approveACLRequest = async (id: number): Promise<ACLRequest> => {
    try {
        const response = await api.put<ACLRequest>(`/acl-requests/${id}/approve`, {});
        return response.data;
    } catch (error) {
        console.error(`Failed to approve ACL request ${id}:`, error);
        throw error;
    }
};

export const rejectACLRequest = async (id: number): Promise<ACLRequest> => {
    try {
        const response = await api.put<ACLRequest>(`/acl-requests/${id}/reject`, {});
        return response.data;
    } catch (error) {
        console.error(`Failed to reject ACL request ${id}:`, error);
        throw error;
    }
};

export const approveTopicRequest = async (id: number): Promise<TopicRequestResponse> => {
    try {
        const response = await api.put<TopicRequestResponse>(`/topic-requests/${id}/approve`, {});
        return response.data;
    } catch (error) {
        console.error(`Failed to approve topic request ${id}:`, error);
        throw error;
    }
};

export const rejectTopicRequest = async (id: number): Promise<TopicRequestResponse> => {
    try {
        const response = await api.put<TopicRequestResponse>(`/topic-requests/${id}/reject`, {});
        return response.data;
    } catch (error) {
        console.error(`Failed to reject topic request ${id}:`, error);
        throw error;
    }
};
