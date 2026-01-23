package com.example.numberguessinggame.controller;

import com.example.numberguessinggame.entity.Game;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.GameRepository;
import com.example.numberguessinggame.service.AchievementService;
import com.example.numberguessinggame.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private AchievementService achievementService;

    @Autowired
    private com.example.numberguessinggame.service.JwtUtil jwtUtil;

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getUserProfile(@RequestHeader("Authorization") String authHeader) {
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

            // Create profile data map
            Map<String, Object> profile = new HashMap<>();

            // Basic user info
            profile.put("username", user.getUsername());
            profile.put("email", user.getEmail());
            profile.put("createdAt", user.getCreatedAt());

            // Game statistics
            Integer totalGames = user.getTotalGames() != null ? user.getTotalGames() : 0;
            Integer totalWins = user.getTotalWins() != null ? user.getTotalWins() : 0;
            Integer bestScore = user.getBestScore();

            profile.put("totalGames", totalGames);
            profile.put("totalWins", totalWins);
            profile.put("totalLosses", totalGames - totalWins);

            // Format win rate as percentage string
            double winRateValue = totalGames > 0 ? (totalWins * 100.0 / totalGames) : 0.0;
            profile.put("winRate", String.format("%.1f%%", winRateValue));
            profile.put("bestScore", bestScore != null ? bestScore : "Not set");

            // Streak statistics
            Integer currentStreak = user.getCurrentWinStreak() != null ? user.getCurrentWinStreak() : 0;
            Integer bestStreak = user.getBestWinStreak() != null ? user.getBestWinStreak() : 0;
            Integer playDays = user.getConsecutivePlayDays() != null ? user.getConsecutivePlayDays() : 0;
            Integer bestDays = user.getBestPlayDayStreak() != null ? user.getBestPlayDayStreak() : 0;

            profile.put("currentWinStreak", currentStreak);
            profile.put("bestWinStreak", bestStreak);
            profile.put("consecutivePlayDays", playDays);
            profile.put("bestPlayDayStreak", bestDays);

            // Coins
            Integer coins = user.getCoins() != null ? user.getCoins() : 0;
            profile.put("coins", coins);

            // Achievement summary
            Map<String, Object> achievementSummary = achievementService.getUserAchievementSummary(user);
            profile.put("achievementSummary", achievementSummary);

            // Recent games (last 10)
            List<Game> recentGames = gameRepository.findTop10ByUserOrderByPlayedAtDesc(user);
            List<Map<String, Object>> recentGamesData = recentGames.stream()
                .map(game -> {
                    Map<String, Object> gameData = new HashMap<>();
                    gameData.put("difficulty", game.getDifficulty());
                    gameData.put("attempts", game.getAttempts());
                    gameData.put("won", game.getWon());

                    // Convert time string to seconds
                    String timeStr = game.getTimeTaken();
                    Integer timeTakenSeconds = null;
                    if (timeStr != null && !timeStr.isEmpty()) {
                        try {
                            String[] parts = timeStr.split(":");
                            if (parts.length == 2) {
                                timeTakenSeconds = Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
                            }
                        } catch (NumberFormatException e) {
                            // If parsing fails, leave as null
                        }
                    }
                    gameData.put("timeTaken", timeTakenSeconds);
                    gameData.put("createdAt", game.getPlayedAt());
                    return gameData;
                })
                .collect(Collectors.toList());
            profile.put("recentGames", recentGamesData);

            // Difficulty breakdown
            List<Game> allGames = gameRepository.findByUser(user);
            Map<String, Integer> difficultyWins = new HashMap<>();
            difficultyWins.put("EASY", 0);
            difficultyWins.put("MEDIUM", 0);
            difficultyWins.put("HARD", 0);

            Map<String, Integer> difficultyGames = new HashMap<>();
            difficultyGames.put("EASY", 0);
            difficultyGames.put("MEDIUM", 0);
            difficultyGames.put("HARD", 0);

            for (Game game : allGames) {
                String difficulty = getDifficultyName(game.getDifficulty());
                difficultyGames.put(difficulty, difficultyGames.get(difficulty) + 1);
                if (game.getWon()) {
                    difficultyWins.put(difficulty, difficultyWins.get(difficulty) + 1);
                }
            }

            Map<String, Object> difficultyStats = new HashMap<>();
            for (String difficulty : Arrays.asList("EASY", "MEDIUM", "HARD")) {
                Map<String, Object> diffData = new HashMap<>();
                int total = difficultyGames.get(difficulty);
                int wins = difficultyWins.get(difficulty);
                diffData.put("total", total);
                diffData.put("wins", wins);
                double rate = total > 0 ? (wins * 100.0 / total) : 0.0;
                diffData.put("winRate", String.format("%.1f%%", rate));
                difficultyStats.put(difficulty, diffData);
            }
            profile.put("difficultyStats", difficultyStats);

            response.put("success", true);
            response.put("profile", profile);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Couldn't load your profile right now. Try refreshing the page!");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Change user password
     */
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request) {
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
            String currentPassword = request.get("currentPassword");
            String newPassword = request.get("newPassword");

            if (currentPassword == null || newPassword == null) {
                response.put("error", "All fields are required");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            // Verify current password
            if (!userService.verifyPassword(user, currentPassword)) {
                response.put("error", "Current password is incorrect");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            // Update password
            userService.updatePassword(user, newPassword);

            response.put("success", true);
            response.put("message", "Password updated successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Failed to update password: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Change user email
     */
    @PostMapping("/change-email")
    public ResponseEntity<Map<String, Object>> changeEmail(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request) {
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
            String newEmail = request.get("newEmail");
            String password = request.get("password");

            if (newEmail == null || password == null) {
                response.put("error", "All fields are required");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            // Verify password
            if (!userService.verifyPassword(user, password)) {
                response.put("error", "Password is incorrect");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            // Check if email is already taken
            if (userService.existsByEmail(newEmail) && !newEmail.equals(user.getEmail())) {
                response.put("error", "Email is already in use");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            // Update email
            userService.updateEmail(user, newEmail);

            response.put("success", true);
            response.put("message", "Email updated successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Failed to update email: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Delete user account
     */
    @DeleteMapping("/delete-account")
    public ResponseEntity<Map<String, Object>> deleteAccount(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request) {
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
            String password = request.get("password");

            if (password == null) {
                response.put("error", "Password is required");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            // Verify password
            if (!userService.verifyPassword(user, password)) {
                response.put("error", "Password is incorrect");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            // Delete account
            userService.deleteAccount(userId);

            response.put("success", true);
            response.put("message", "Account deleted successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Failed to delete account: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private String getDifficultyName(int difficulty) {
        switch (difficulty) {
            case 0: return "EASY";
            case 1: return "MEDIUM";
            case 2: return "HARD";
            default: return "UNKNOWN";
        }
    }
}
