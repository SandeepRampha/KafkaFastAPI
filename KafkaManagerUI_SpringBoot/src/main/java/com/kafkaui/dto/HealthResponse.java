package com.kafkaui.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class HealthResponse {
    private int topicsCount;
    private int aclsCount;
    private String clusterState;
    private RequestStats requests;
    private ClusterOverview clusterOverview;
    private BrokerStatus brokerStatus;
    private ControllerHealth controllerHealth;
    private Map<String, Object> schemaRegistry;

    @Data
    @Builder
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class RequestStats {
        private int approved;
        private int rejected;
        private int pending;
        private ResourceStats topics;
        private ResourceStats acls;
    }

    @Data
    @Builder
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class ResourceStats {
        private int approved;
        private int rejected;
        private int pending;
    }

    @Data
    @Builder
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class ClusterOverview {
        private String clusterName;
        private String clusterId;
        private String confluentVersion;
        private String mode;
        private String state;
        private double connectionLatencyMs;
        private String lastMetadataRefresh;
    }

    @Data
    @Builder
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class BrokerStatus {
        private int totalBrokers;
        private int onlineBrokers;
        private int offlineBrokers;
        private int totalPartitions;
        private int totalReplicas;
        private int underReplicatedPartitions;
        private int offlinePartitions;
        private Integer controllerId;
        private List<String> brokerHosts;
    }

    @Data
    @Builder
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class ControllerHealth {
        private Object activeControllerId;
        private boolean isActive;
    }
}
