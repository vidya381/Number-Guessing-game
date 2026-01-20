package com.example.numberguessinggame.service;

import com.example.numberguessinggame.config.WebSocketEventListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for checking user online/offline presence status
 * Wraps WebSocketEventListener for cleaner API
 */
@Service
public class PresenceService {

    @Autowired
    private WebSocketEventListener webSocketEventListener;

    /**
     * Check if a single user is online
     */
    public boolean isUserOnline(Long userId) {
        if (userId == null) {
            return false;
        }
        return webSocketEventListener.isUserOnline(userId);
    }

    /**
     * Get online status for multiple users (batch check)
     * Useful for friends list where we need to check many users at once
     */
    public Map<Long, Boolean> getUsersOnlineStatus(List<Long> userIds) {
        Map<Long, Boolean> statusMap = new HashMap<>();

        if (userIds == null || userIds.isEmpty()) {
            return statusMap;
        }

        for (Long userId : userIds) {
            statusMap.put(userId, isUserOnline(userId));
        }

        return statusMap;
    }

    /**
     * Get all currently online users
     */
    public Map<Long, String> getAllOnlineUsers() {
        return webSocketEventListener.getOnlineUsers();
    }

    /**
     * Get the WebSocket session ID for a user (if online)
     */
    public String getUserSession(Long userId) {
        return webSocketEventListener.getUserSession(userId);
    }
}
