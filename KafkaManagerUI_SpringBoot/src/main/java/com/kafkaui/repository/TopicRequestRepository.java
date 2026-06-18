package com.kafkaui.repository;

import com.kafkaui.entity.TopicRequest;
import com.kafkaui.entity.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TopicRequestRepository extends JpaRepository<TopicRequest, Integer> {
    long countByStatus(RequestStatus status);
}
