package com.example.numberguessinggame.controller;

import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();

        try {
            String username = request.get("username");
            String email = request.get("email");
            String password = request.get("password");

            if (username == null || username.trim().isEmpty()) {
                response.put("error", "Username is required");
                return ResponseEntity.badRequest().body(response);
            }

            if (email == null || email.trim().isEmpty()) {
                response.put("error", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }

            if (password == null || password.length() < 6) {
                response.put("error", "Password must be at least 6 characters");
                return ResponseEntity.badRequest().body(response);
            }

            User user = userService.registerUser(username.trim(), email.trim(), password);
            String token = userService.authenticateUser(username.trim(), password);

            response.put("success", true);
            response.put("token", token);
            response.put("userId", user.getId());
            response.put("username", user.getUsername());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();

        try {
            String username = request.get("username");
            String password = request.get("password");

            if (username == null || username.trim().isEmpty()) {
                response.put("error", "Username is required");
                return ResponseEntity.badRequest().body(response);
            }

            if (password == null || password.isEmpty()) {
                response.put("error", "Password is required");
                return ResponseEntity.badRequest().body(response);
            }

            String token = userService.authenticateUser(username.trim(), password);
            User user = userService.findByUsername(username.trim())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            response.put("success", true);
            response.put("token", token);
            response.put("userId", user.getId());
            response.put("username", user.getUsername());
            response.put("bestScore", user.getBestScore());
            response.put("totalGames", user.getTotalGames());
            response.put("totalWins", user.getTotalWins());
            response.put("currentWinStreak", user.getCurrentWinStreak());
            response.put("bestWinStreak", user.getBestWinStreak());
            response.put("consecutivePlayDays", user.getConsecutivePlayDays());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    @GetMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyToken(@RequestHeader("Authorization") String authHeader) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                response.put("error", "Invalid authorization header");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            String token = authHeader.substring(7);
            String username = userService.findById(
                    Long.parseLong(token.split("\\.")[1])
            ).map(User::getUsername).orElse(null);

            if (username == null) {
                response.put("error", "Invalid token");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            response.put("success", true);
            response.put("username", username);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Token verification failed");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }
}
