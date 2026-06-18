package com.kafkaui.service;

import com.kafkaui.dto.HealthResponse;
import com.kafkaui.entity.RequestStatus;
import com.kafkaui.repository.AclRequestRepository;
import com.kafkaui.repository.TopicRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HealthService {

    private final KafkaAdminService kafkaAdminService;
    private final TopicRequestRepository topicRequestRepository;
    private final AclRequestRepository aclRequestRepository;
    private final jakarta.persistence.EntityManager entityManager;

    @Transactional
    public HealthResponse getDashboardData(String cluster) {
        Map<String, Object> kafkaStats = kafkaAdminService.getClusterStats();
        
        long topicPending = 0, topicApproved = 0, topicRejected = 0;
        long aclPending = 0, aclApproved = 0, aclRejected = 0;
        
        try {
            entityManager.joinTransaction();
            
            // 1. Fetch counts from topic_requests
            topicPending = topicRequestRepository.countByStatus(RequestStatus.PENDING);
            topicApproved = topicRequestRepository.countByStatus(RequestStatus.APPROVED);
            topicRejected = topicRequestRepository.countByStatus(RequestStatus.REJECTED);

            // 2. Fetch counts from acl_requests
            aclPending = aclRequestRepository.countByStatus(RequestStatus.PENDING);
            aclApproved = aclRequestRepository.countByStatus(RequestStatus.APPROVED);
            aclRejected = aclRequestRepository.countByStatus(RequestStatus.REJECTED);

            // 3. Aggregate with governance_requests
            try {
                // Topic Governance
                topicPending += ((Number) entityManager.createNativeQuery(
                    "SELECT count(*) FROM governance_requests WHERE resource_type = 'TOPIC' AND status IN ('REQUESTED', 'UNDER_REVIEW')"
                ).getSingleResult()).longValue();
                topicApproved += ((Number) entityManager.createNativeQuery(
                    "SELECT count(*) FROM governance_requests WHERE resource_type = 'TOPIC' AND status IN ('APPROVED', 'IMPLEMENTED')"
                ).getSingleResult()).longValue();
                topicRejected += ((Number) entityManager.createNativeQuery(
                    "SELECT count(*) FROM governance_requests WHERE resource_type = 'TOPIC' AND status IN ('REJECTED', 'IMPLEMENTATION_FAILED')"
                ).getSingleResult()).longValue();

                // ACL Governance
                aclPending += ((Number) entityManager.createNativeQuery(
                    "SELECT count(*) FROM governance_requests WHERE resource_type = 'ACL' AND status IN ('REQUESTED', 'UNDER_REVIEW')"
                ).getSingleResult()).longValue();
                aclApproved += ((Number) entityManager.createNativeQuery(
                    "SELECT count(*) FROM governance_requests WHERE resource_type = 'ACL' AND status IN ('APPROVED', 'IMPLEMENTED')"
                ).getSingleResult()).longValue();
                aclRejected += ((Number) entityManager.createNativeQuery(
                    "SELECT count(*) FROM governance_requests WHERE resource_type = 'ACL' AND status IN ('REJECTED', 'IMPLEMENTATION_FAILED')"
                ).getSingleResult()).longValue();

            } catch (Exception e) {
                System.err.println("Error fetching governance counts: " + e.getMessage());
            }
        } catch (Exception e) {
            System.err.println("DEBUG: Maintenance check failed: " + e.getMessage());
        }

        long totalPending = topicPending + aclPending;
        long totalApproved = topicApproved + aclApproved;
        long totalRejected = topicRejected + aclRejected;

        Map<String, Object> brokerStats = castToMap(kafkaStats.get("broker_status"));
        Map<String, Object> controllerStats = castToMap(kafkaStats.get("controller_health"));
        Map<String, Object> clusterOverview = castToMap(kafkaStats.get("cluster_overview"));

        return HealthResponse.builder()
                .topicsCount((Integer) kafkaStats.get("topics_count"))
                .aclsCount((Integer) kafkaStats.get("acls_count"))
                .clusterState((String) kafkaStats.get("cluster_state"))
                .requests(HealthResponse.RequestStats.builder()
                        .approved((int) totalApproved)
                        .rejected((int) totalRejected)
                        .pending((int) totalPending)
                        .topics(HealthResponse.ResourceStats.builder()
                                .approved((int) topicApproved)
                                .rejected((int) topicRejected)
                                .pending((int) topicPending)
                                .build())
                        .acls(HealthResponse.ResourceStats.builder()
                                .approved((int) aclApproved)
                                .rejected((int) aclRejected)
                                .pending((int) aclPending)
                                .build())
                        .build())
                .clusterOverview(HealthResponse.ClusterOverview.builder()
                        .clusterName(cluster)
                        .clusterId((String) clusterOverview.get("cluster_id"))
                        .confluentVersion((String) clusterOverview.get("confluent_version"))
                        .mode((String) clusterOverview.get("mode"))
                        .state((String) clusterOverview.get("state"))
                        .connectionLatencyMs((Double) clusterOverview.get("connection_latency_ms"))
                        .lastMetadataRefresh((String) clusterOverview.get("last_metadata_refresh"))
                        .build())
                .brokerStatus(HealthResponse.BrokerStatus.builder()
                        .totalBrokers((Integer) brokerStats.get("total_brokers"))
                        .onlineBrokers((Integer) brokerStats.get("online_brokers"))
                        .offlineBrokers((Integer) brokerStats.get("offline_brokers"))
                        .totalPartitions((Integer) brokerStats.get("total_partitions"))
                        .totalReplicas((Integer) brokerStats.get("total_replicas"))
                        .underReplicatedPartitions((Integer) brokerStats.get("under_replicated_partitions"))
                        .offlinePartitions((Integer) brokerStats.get("offline_partitions"))
                        .controllerId((Integer) brokerStats.get("controller_id"))
                        .brokerHosts((List<String>) brokerStats.get("broker_hosts"))
                        .build())
                .controllerHealth(HealthResponse.ControllerHealth.builder()
                        .activeControllerId(controllerStats.get("active_controller_id"))
                        .isActive((Boolean) controllerStats.get("is_active"))
                        .build())
                .schemaRegistry(Map.of("status", "Healthy", "subjects_count", 0, "latency_ms", 0.0))
                .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castToMap(Object obj) {
        if (obj instanceof Map) {
            return (Map<String, Object>) obj;
        }
        return Map.of();
    }
}
