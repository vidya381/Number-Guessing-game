package com.example.numberguessinggame.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.HandshakeInterceptor;
import com.example.numberguessinggame.service.JwtUtil;

import java.util.Map;

/**
 * WebSocket configuration for multiplayer real-time communication
 * Enables STOMP over WebSocket with SockJS fallback
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private JwtUtil jwtUtil;

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
                .addInterceptors(new HandshakeInterceptor() {
                    @Override
                    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                                   WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
                        // Extract token from query parameter
                        if (request instanceof ServletServerHttpRequest) {
                            ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
                            String token = servletRequest.getServletRequest().getParameter("token");

                            if (token != null && !token.isEmpty()) {
                                try {
                                    Long userId = jwtUtil.extractUserId(token);
                                    if (userId != null) {
                                        attributes.put("userId", userId);
                                    }
                                } catch (Exception e) {
                                    // Invalid token, but allow connection
                                }
                            }
                        }
                        return true;
                    }

                    @Override
                    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                             WebSocketHandler wsHandler, Exception exception) {
                        // Nothing to do after handshake
                    }
                })
                .withSockJS(); // Enable SockJS fallback for browsers without WebSocket support
    }
}
