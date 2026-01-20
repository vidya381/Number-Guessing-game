package com.example.numberguessinggame.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration for multiplayer real-time communication
 * Enables STOMP over WebSocket with SockJS fallback
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Configure message broker for pub/sub messaging
     * - /topic: broadcast messages to multiple subscribers
     * - /queue: point-to-point messages to individual users
     * - /app: application destination prefix for @MessageMapping
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple in-memory message broker with /topic and /queue prefixes
        config.enableSimpleBroker("/topic", "/queue");

        // Set application destination prefix for @MessageMapping methods
        config.setApplicationDestinationPrefixes("/app");

        // Set user destination prefix for user-specific messages
        config.setUserDestinationPrefix("/user");
    }

    /**
     * Register WebSocket endpoint with SockJS fallback
     * Endpoint: /ws (accessible to all users, auth handled at connection)
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Allow all origins (consider restricting in production)
                .withSockJS(); // Enable SockJS fallback for browsers without WebSocket support
    }
}
