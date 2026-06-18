package com.kafkaui.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @GetMapping("/me")
    public Map<String, Object> getMe(@AuthenticationPrincipal Jwt jwt) {
        Map<String, Object> response = new HashMap<>();
        String username = jwt.getClaimAsString("preferred_username");
        if (username == null) username = jwt.getClaimAsString("sub");
        
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        List<String> roles = (List<String>) realmAccess.get("roles");
        
        String appRole = "user";
        if (roles.contains("ADMIN") || roles.contains("admin")) {
            appRole = "admin";
        } else if (roles.contains("DATA_STEWARD") || roles.contains("data_steward")) {
            appRole = "data_steward";
        }

        boolean isAdmin = "admin".equals(appRole);
        
        List<String> groups = new java.util.ArrayList<>();
        if (isAdmin) groups.add("admins");
        if ("data_steward".equals(appRole)) groups.add("stewards");
        if (groups.isEmpty()) groups.add("users");

        response.put("username", username);
        response.put("role", appRole);
        response.put("roles", roles);
        response.put("tenant", jwt.getClaimAsString("tenant") != null ? jwt.getClaimAsString("tenant") : "default");
        response.put("is_admin", isAdmin);
        response.put("groups", groups);
        response.put("subject", jwt.getSubject());
        
        return response;
    }

    @GetMapping("/status")
    public Map<String, String> getStatus() {
        return Map.of("status", "authenticated");
    }
}
