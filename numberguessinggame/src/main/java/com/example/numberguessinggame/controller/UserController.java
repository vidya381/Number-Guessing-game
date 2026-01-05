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
            profile.put("currentWinStreak", user.getCurrentWinStreak() != null ? user.getCurrentWinStreak() : 0);
            profile.put("bestWinStreak", user.getBestWinStreak() != null ? user.getBestWinStreak() : 0);
            profile.put("consecutivePlayDays", user.getConsecutivePlayDays() != null ? user.getConsecutivePlayDays() : 0);
            profile.put("bestPlayDayStreak", user.getBestPlayDayStreak() != null ? user.getBestPlayDayStreak() : 0);

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

    private String getDifficultyName(int difficulty) {
        switch (difficulty) {
            case 0: return "EASY";
            case 1: return "MEDIUM";
            case 2: return "HARD";
            default: return "UNKNOWN";
        }
    }
}
