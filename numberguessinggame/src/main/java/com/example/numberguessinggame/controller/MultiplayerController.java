package com.example.numberguessinggame.controller;

import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.service.JwtUtil;
import com.example.numberguessinggame.service.MultiplayerService;
import com.example.numberguessinggame.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/multiplayer")
public class MultiplayerController {

    @Autowired
    private MultiplayerService multiplayerService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Create a new challenge to a friend
     */
    @PostMapping("/challenge")
    public ResponseEntity<Map<String, Object>> createChallenge(
            @RequestBody Map<String, Object> requestBody,
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

            // Extract parameters
            Long challengedId = ((Number) requestBody.get("challengedId")).longValue();
            Integer difficulty = ((Number) requestBody.get("difficulty")).intValue();

            // Create challenge
            Map<String, Object> result = multiplayerService.createChallenge(user, challengedId, difficulty);

            // Send WebSocket notification to challenged user
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "challenge_received");
            notification.put("challengeId", result.get("challengeId"));
            notification.put("challengerId", user.getId());
            notification.put("challengerUsername", user.getUsername());
            notification.put("difficulty", difficulty);
            notification.put("expiresAt", result.get("expiresAt"));

            messagingTemplate.convertAndSend("/queue/challenges." + challengedId, notification);

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to create challenge: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Accept a challenge
     */
    @PostMapping("/challenge/{id}/accept")
    public ResponseEntity<Map<String, Object>> acceptChallenge(
            @PathVariable Long id,
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
            Map<String, Object> result = multiplayerService.acceptChallenge(user, id);

            // Send WebSocket notification to both players
            Long opponentId = ((Number) result.get("opponentId")).longValue();
            String sessionId = (String) result.get("sessionId");
            Integer digitCount = (Integer) result.get("digitCount");
            Integer difficulty = (Integer) result.get("difficulty");
            String opponentUsername = (String) result.get("opponentUsername");

            // Notify challenger (user1) that game has started
            Map<String, Object> challengerNotification = new HashMap<>();
            challengerNotification.put("type", "game_started");
            challengerNotification.put("sessionId", sessionId);
            challengerNotification.put("digitCount", digitCount);
            challengerNotification.put("difficulty", difficulty);
            challengerNotification.put("opponentId", user.getId());
            challengerNotification.put("opponentUsername", user.getUsername());
            messagingTemplate.convertAndSend("/queue/game." + opponentId, challengerNotification);

            // Notify accepter (user2) that game has started
            Map<String, Object> accepterNotification = new HashMap<>();
            accepterNotification.put("type", "game_started");
            accepterNotification.put("sessionId", sessionId);
            accepterNotification.put("digitCount", digitCount);
            accepterNotification.put("difficulty", difficulty);
            accepterNotification.put("opponentId", opponentId);
            accepterNotification.put("opponentUsername", opponentUsername);
            messagingTemplate.convertAndSend("/queue/game." + user.getId(), accepterNotification);

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to accept challenge: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Decline a challenge
     */
    @PostMapping("/challenge/{id}/decline")
    public ResponseEntity<Map<String, Object>> declineChallenge(
            @PathVariable Long id,
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
            Map<String, Object> result = multiplayerService.declineChallenge(user, id);

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to decline challenge: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Cancel a challenge (before it's accepted)
     */
    @PostMapping("/challenge/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelChallenge(
            @PathVariable Long id,
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
            Map<String, Object> result = multiplayerService.cancelChallenge(user, id);

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to cancel challenge: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get pending challenges (received)
     */
    @GetMapping("/challenges/pending")
    public ResponseEntity<Map<String, Object>> getPendingChallenges(
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
            List<Map<String, Object>> challenges = multiplayerService.getPendingChallenges(user);

            response.put("success", true);
            response.put("challenges", challenges);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Failed to get pending challenges: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get sent challenges (outgoing)
     */
    @GetMapping("/challenges/sent")
    public ResponseEntity<Map<String, Object>> getSentChallenges(
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
            List<Map<String, Object>> challenges = multiplayerService.getSentChallenges(user);

            response.put("success", true);
            response.put("challenges", challenges);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Failed to get sent challenges: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Submit a guess in a multiplayer game
     */
    @PostMapping("/guess")
    public ResponseEntity<Map<String, Object>> submitGuess(
            @RequestBody Map<String, String> requestBody,
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
            String sessionId = requestBody.get("sessionId");
            String guess = requestBody.get("guess");

            if (sessionId == null || guess == null) {
                response.put("error", "Session ID and guess are required");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            Map<String, Object> result = multiplayerService.submitGuess(user, sessionId, guess);
            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to submit guess: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get status of a multiplayer game session
     */
    @GetMapping("/status/{sessionId}")
    public ResponseEntity<Map<String, Object>> getSessionStatus(
            @PathVariable String sessionId,
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
            Map<String, Object> status = multiplayerService.getSessionStatus(user, sessionId);
            return ResponseEntity.ok(status);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to get session status: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get multiplayer statistics for current user
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getMultiplayerStats(
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
            Map<String, Object> stats = multiplayerService.getMultiplayerStats(user);

            response.put("success", true);
            response.put("stats", stats);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Failed to get multiplayer stats: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Leave/forfeit an active game
     */
    @PostMapping("/leave")
    public ResponseEntity<Map<String, Object>> leaveGame(
            @RequestBody Map<String, Object> requestBody,
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
            String sessionId = (String) requestBody.get("sessionId");

            // Handle player leaving/forfeiting the game
            multiplayerService.leaveGame(user, sessionId);

            response.put("success", true);
            response.put("message", "Left game successfully");
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Failed to leave game: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
