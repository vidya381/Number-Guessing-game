package com.example.numberguessinggame.controller;

import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.service.FriendsService;
import com.example.numberguessinggame.service.JwtUtil;
import com.example.numberguessinggame.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/friends")
public class FriendsController {

    @Autowired
    private FriendsService friendsService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Search users by username
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchUsers(
            @RequestParam String query,
            @RequestHeader("Authorization") String authHeader) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                response.put("error", "Your session expired. Please log in again!");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);

            Optional<User> userOptional = userService.findById(userId);
            if (userOptional.isEmpty()) {
                response.put("error", "Couldn't find your account. Try logging in again!");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            User user = userOptional.get();
            List<Map<String, Object>> users = friendsService.searchUsers(query, user);

            response.put("success", true);
            response.put("users", users);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Failed to search users: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Send a friend request
     */
    @PostMapping("/request")
    public ResponseEntity<Map<String, Object>> sendFriendRequest(
            @RequestBody Map<String, Long> requestBody,
            @RequestHeader("Authorization") String authHeader) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                response.put("error", "Your session expired. Please log in again!");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);

            Optional<User> userOptional = userService.findById(userId);
            if (userOptional.isEmpty()) {
                response.put("error", "Couldn't find your account. Try logging in again!");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            User user = userOptional.get();
            Long toUserId = requestBody.get("toUserId");

            if (toUserId == null) {
                response.put("error", "Target user ID is required");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            Map<String, Object> result = friendsService.sendFriendRequest(user, toUserId);
            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to send friend request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Accept a friend request
     */
    @PostMapping("/accept/{requestId}")
    public ResponseEntity<Map<String, Object>> acceptFriendRequest(
            @PathVariable Long requestId,
            @RequestHeader("Authorization") String authHeader) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                response.put("error", "Your session expired. Please log in again!");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);

            Optional<User> userOptional = userService.findById(userId);
            if (userOptional.isEmpty()) {
                response.put("error", "Couldn't find your account. Try logging in again!");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            User user = userOptional.get();
            Map<String, Object> result = friendsService.acceptFriendRequest(user, requestId);
            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to accept friend request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Decline a friend request
     */
    @PostMapping("/decline/{requestId}")
    public ResponseEntity<Map<String, Object>> declineFriendRequest(
            @PathVariable Long requestId,
            @RequestHeader("Authorization") String authHeader) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                response.put("error", "Your session expired. Please log in again!");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);

            Optional<User> userOptional = userService.findById(userId);
            if (userOptional.isEmpty()) {
                response.put("error", "Couldn't find your account. Try logging in again!");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            User user = userOptional.get();
            Map<String, Object> result = friendsService.declineFriendRequest(user, requestId);
            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to decline friend request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Remove a friend
     */
    @DeleteMapping("/{friendId}")
    public ResponseEntity<Map<String, Object>> removeFriend(
            @PathVariable Long friendId,
            @RequestHeader("Authorization") String authHeader) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                response.put("error", "Your session expired. Please log in again!");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);

            Optional<User> userOptional = userService.findById(userId);
            if (userOptional.isEmpty()) {
                response.put("error", "Couldn't find your account. Try logging in again!");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            User user = userOptional.get();
            Map<String, Object> result = friendsService.removeFriend(user, friendId);
            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to remove friend: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get list of friends
     */
    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> getFriends(
            @RequestHeader("Authorization") String authHeader) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                response.put("error", "Your session expired. Please log in again!");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);

            Optional<User> userOptional = userService.findById(userId);
            if (userOptional.isEmpty()) {
                response.put("error", "Couldn't find your account. Try logging in again!");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            User user = userOptional.get();
            List<Map<String, Object>> friends = friendsService.getFriends(user);

            response.put("success", true);
            response.put("friends", friends);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Failed to get friends: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get pending friend requests
     */
    @GetMapping("/requests/pending")
    public ResponseEntity<Map<String, Object>> getPendingRequests(
            @RequestHeader("Authorization") String authHeader) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                response.put("error", "Your session expired. Please log in again!");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);

            Optional<User> userOptional = userService.findById(userId);
            if (userOptional.isEmpty()) {
                response.put("error", "Couldn't find your account. Try logging in again!");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            User user = userOptional.get();
            List<Map<String, Object>> requests = friendsService.getPendingRequests(user);

            response.put("success", true);
            response.put("requests", requests);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Failed to get pending requests: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
