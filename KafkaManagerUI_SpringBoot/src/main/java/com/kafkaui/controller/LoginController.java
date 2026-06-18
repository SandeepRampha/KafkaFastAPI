package com.kafkaui.controller;

import com.kafkaui.dto.LoginRequest;
import com.kafkaui.dto.LoginResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class LoginController {

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuerUri;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        String tokenEndpoint = issuerUri + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("grant_type", "password");
        map.add("client_id", "kafka-ui-frontend"); // Using the same client ID as frontend
        map.add("username", loginRequest.getUsername());
        map.add("password", loginRequest.getPassword());
        // If client was confidential, we'd add client_secret here

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenEndpoint, request, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null) {
                LoginResponse loginResponse = LoginResponse.builder()
                        .accessToken((String) body.get("access_token"))
                        .refreshToken((String) body.get("refresh_token"))
                        .tokenType((String) body.get("token_type"))
                        .expiresIn(((Number) body.get("expires_in")).longValue())
                        .build();
                return ResponseEntity.ok(loginResponse);
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials or Keycloak unreachable"));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
