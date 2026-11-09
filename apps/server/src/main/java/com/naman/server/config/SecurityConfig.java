package com.naman.server.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. Disable CSRF for stateless REST APIs (typically used with JWTs)
                .csrf(csrf -> csrf.disable())

                // 2. Define route protections
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints that don't need authentication
                        .requestMatchers("/api/actuator/health", "/api/actuator/health/**").permitAll()
                        .requestMatchers("/api/auth/**", "/api/hello", "/hello/**").permitAll()

                        // Endpoints protected by specific user roles
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // All other endpoints require the user to be authenticated
                        .anyRequest().authenticated());

        return http.build();
    }
}
