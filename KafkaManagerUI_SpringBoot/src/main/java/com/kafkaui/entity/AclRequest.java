package com.kafkaui.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "acl_requests")
@Data
public class AclRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String operation;

    @Column(name = "kafka_operation")
    private String kafkaOperation;

    @Column(name = "permission_type")
    private String permissionType;

    @Column(name = "pattern_type")
    private String patternType = "LITERAL";

    @Column(name = "resource_type", nullable = false)
    private String resourceType;

    @Column(name = "resource_name", nullable = false)
    private String resourceName;

    private String principal;
    private String host = "*";

    @Column(nullable = false)
    private String cluster = "default";

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false)
    private RequestStatus status = RequestStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "admin_comment")
    private String adminComment;
}
