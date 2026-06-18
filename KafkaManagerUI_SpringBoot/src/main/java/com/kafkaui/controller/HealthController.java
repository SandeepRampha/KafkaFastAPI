package com.kafkaui.controller;

import com.kafkaui.dto.HealthResponse;
import com.kafkaui.service.HealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
public class HealthController {

    private final HealthService healthService;

    @GetMapping
    public HealthResponse getHealth(@RequestParam(defaultValue = "default") String cluster) {
        return healthService.getDashboardData(cluster);
    }
}
