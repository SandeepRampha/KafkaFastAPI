package com.kafkaui.repository;

import com.kafkaui.entity.AclRequest;
import com.kafkaui.entity.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AclRequestRepository extends JpaRepository<AclRequest, Integer> {
    long countByStatus(RequestStatus status);
}
