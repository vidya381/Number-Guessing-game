package com.example.numberguessinggame.config;

import com.example.numberguessinggame.service.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Listens to WebSocket connection and disconnection events
 * Tracks online users and broadcasts presence updates
 */
@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private JwtUtil jwtUtil;

    // Map of userId -> WebSocket sessionId
    private final Map<Long, String> onlineUsers = new ConcurrentHashMap<>();

    // Map of sessionId -> userId (for reverse lookup on disconnect)
    private final Map<String, Long> sessionToUser = new ConcurrentHashMap<>();

    /**
     * Handle WebSocket connection event
     * Extract user ID from JWT token and mark user as online
     */
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        // Extract userId from session attributes (set by handshake interceptor)
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes != null && sessionAttributes.containsKey("userId")) {
            Long userId = (Long) sessionAttributes.get("userId");

            // Mark user as online
            onlineUsers.put(userId, sessionId);
            sessionToUser.put(sessionId, userId);

            logger.info("User {} connected with session {}", userId, sessionId);

            // Broadcast presence update to topic
            broadcastPresenceUpdate(userId, true);
        } else {
            logger.warn("No userId found in WebSocket session attributes for session {}", sessionId);
        }
    }

    /**
     * Handle WebSocket disconnection event
     * Mark user as offline and broadcast presence update
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        // Get userId from session mapping
        Long userId = sessionToUser.remove(sessionId);
        if (userId != null) {
            // Remove from online users
            onlineUsers.remove(userId);

            logger.info("User {} disconnected (session {})", userId, sessionId);

            // Broadcast presence update to topic
            broadcastPresenceUpdate(userId, false);
        }
    }

    /**
     * Broadcast presence update to all subscribers
     */
    private void broadcastPresenceUpdate(Long userId, boolean online) {
        try {
            Map<String, Object> presenceUpdate = Map.of(
                "userId", userId,
                "online", online,
                "timestamp", System.currentTimeMillis()
            );

            messagingTemplate.convertAndSend("/topic/presence", presenceUpdate);
        } catch (Exception e) {
            logger.error("Failed to broadcast presence update: {}", e.getMessage());
        }
    }

    /**
     * Check if a user is currently online
     */
    public boolean isUserOnline(Long userId) {
        return onlineUsers.containsKey(userId);
    }

    /**
     * Get all online user IDs
     */
    public Map<Long, String> getOnlineUsers() {
        return new ConcurrentHashMap<>(onlineUsers);
    }

    /**
     * Get the session ID for a user (if online)
     */
    public String getUserSession(Long userId) {
        return onlineUsers.get(userId);
    }

    /**
     * Manually register a user connection (for testing or manual management)
     */
    public void registerUserConnection(Long userId, String sessionId) {
        onlineUsers.put(userId, sessionId);
        sessionToUser.put(sessionId, userId);
        broadcastPresenceUpdate(userId, true);
    }

    /**
     * Manually unregister a user connection
     */
    public void unregisterUserConnection(Long userId) {
        String sessionId = onlineUsers.remove(userId);
        if (sessionId != null) {
            sessionToUser.remove(sessionId);
            broadcastPresenceUpdate(userId, false);
        }
    }
}
