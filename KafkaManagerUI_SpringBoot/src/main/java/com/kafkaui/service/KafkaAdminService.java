package com.kafkaui.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.DescribeClusterResult;
import org.apache.kafka.clients.admin.ListTopicsResult;
import org.apache.kafka.common.Node;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaAdminService {

    private final AdminClient adminClient;

    public Map<String, Object> getClusterStats() {
        try {
            long startTime = System.currentTimeMillis();
            DescribeClusterResult cluster = adminClient.describeCluster();
            ListTopicsResult topics = adminClient.listTopics();
            
            Collection<Node> nodes = cluster.nodes().get(10, TimeUnit.SECONDS);
            Collection<String> topicNames = topics.names().get(10, TimeUnit.SECONDS);
            String clusterId = cluster.clusterId().get(10, TimeUnit.SECONDS);
            Node controller = cluster.controller().get(10, TimeUnit.SECONDS);
            
            long latency = System.currentTimeMillis() - startTime;

            // 1. Fetch ACLs Count
            int aclsCount = 0;
            try {
                aclsCount = adminClient.describeAcls(org.apache.kafka.common.acl.AclBindingFilter.ANY)
                    .values().get(10, TimeUnit.SECONDS).size();
            } catch (Exception e) {
                log.warn("Could not fetch ACL count: {}", e.getMessage());
            }

            // 2. Fetch Detailed Topic/Partition Stats
            Map<String, org.apache.kafka.clients.admin.TopicDescription> topicDetails = 
                adminClient.describeTopics(topicNames).allTopicNames().get(10, TimeUnit.SECONDS);
            
            int totalPartitions = 0;
            int totalReplicas = 0;
            int underReplicated = 0;
            int offlinePartitions = 0;

            for (var entry : topicDetails.values()) {
                for (var p : entry.partitions()) {
                    totalPartitions++;
                    totalReplicas += p.replicas().size();
                    if (p.leader() == null) offlinePartitions++;
                    if (p.isr().size() < p.replicas().size()) underReplicated++;
                }
            }

            // 3. Detect Mode and Version via Configs
            String mode = "Unknown";
            String confluentVersion = "Unknown Confluent Version";
            
            /* 
            try {
                org.apache.kafka.clients.admin.ConfigResource brokerResource = 
                    new org.apache.kafka.clients.admin.ConfigResource(org.apache.kafka.clients.admin.ConfigResource.Type.BROKER, String.valueOf(controller.id()));
                
                var configs = adminClient.describeConfigs(java.util.List.of(brokerResource)).all().get(10, TimeUnit.SECONDS);
                var brokerConfigs = configs.get(brokerResource);
                
                // Detect Mode
                if (brokerConfigs.get("process.roles") != null && brokerConfigs.get("process.roles").value() != null) {
                    mode = "KRaft";
                } else if (brokerConfigs.get("zookeeper.connect") != null && brokerConfigs.get("zookeeper.connect").value() != null) {
                    mode = "ZooKeeper";
                }

                // Detect Version
                var versionConfig = brokerConfigs.get("inter.broker.protocol.version");
                if (versionConfig != null && versionConfig.value() != null) {
                    String v = versionConfig.value();
                    String cpVer = "Unknown CP";
                    if (v.startsWith("3.9")) cpVer = "7.9";
                    else if (v.startsWith("3.8")) cpVer = "7.8";
                    else if (v.startsWith("3.7")) cpVer = "7.6/7.7";
                    else if (v.startsWith("3.6")) cpVer = "7.5";
                    else if (v.startsWith("3.5")) cpVer = "7.4";
                    else if (v.startsWith("3.4")) cpVer = "7.3";
                    else if (v.startsWith("3.3")) cpVer = "7.2";
                    else if (v.startsWith("3.2")) cpVer = "7.1";
                    else if (v.startsWith("3.1")) cpVer = "7.0";
                    else if (v.startsWith("3.0")) cpVer = "7.0";
                    else if (v.startsWith("2.8")) cpVer = "6.2";
                    
                    confluentVersion = "Confluent " + cpVer + " (Kafka " + v + ")";
                }
            } catch (Exception e) {
                log.warn("Could not fetch broker configs for version/mode detection: {}", e.getMessage());
            }
            */

            // 4. Calculate Broker Stats (Online vs Offline)
            java.util.Set<Integer> totalBrokerIds = new java.util.HashSet<>();
            nodes.forEach(n -> totalBrokerIds.add(n.id()));
            
            for (var entry : topicDetails.values()) {
                for (var p : entry.partitions()) {
                    p.replicas().forEach(r -> totalBrokerIds.add(r.id()));
                }
            }

            int totalBrokersCount = totalBrokerIds.size();
            int onlineBrokersCount = nodes.size();
            int offlineBrokersCount = totalBrokersCount - onlineBrokersCount;

            return Map.of(
                "topics_count", topicNames.size(),
                "acls_count", aclsCount,
                "cluster_state", (offlinePartitions > 0 || offlineBrokersCount > 0 || controller == null) ? "Unhealthy" : (underReplicated > 0 ? "Degraded" : "Healthy"),
                "cluster_overview", Map.of(
                    "cluster_id", clusterId != null ? clusterId : "Unknown",
                    "confluent_version", confluentVersion,
                    "mode", mode,
                    "connection_latency_ms", (double) latency,
                    "state", (offlinePartitions > 0 || offlineBrokersCount > 0 || controller == null) ? "Unhealthy" : (underReplicated > 0 ? "Degraded" : "Healthy"),
                    "last_metadata_refresh", java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                ),
                "broker_status", Map.of(
                    "total_brokers", totalBrokersCount,
                    "online_brokers", onlineBrokersCount,
                    "offline_brokers", offlineBrokersCount,
                    "total_partitions", totalPartitions,
                    "total_replicas", totalReplicas,
                    "under_replicated_partitions", underReplicated,
                    "offline_partitions", offlinePartitions,
                    "controller_id", controller != null ? controller.id() : -1,
                    "broker_hosts", nodes.stream().map(n -> n.host() + ":" + n.port()).toList()
                ),
                "controller_health", Map.of(
                    "active_controller_id", controller != null ? controller.id() : -1,
                    "is_active", controller != null
                )
            );
        } catch (Exception e) {
            log.error("Error fetching Kafka stats", e);
            return Map.of("cluster_state", "Degraded", "error", e.getMessage());
        }
    }
}
