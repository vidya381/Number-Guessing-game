package com.example.numberguessinggame.controller;

import com.example.numberguessinggame.entity.Achievement;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.UserRepository;
import com.example.numberguessinggame.service.AchievementService;
import com.example.numberguessinggame.service.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/achievements")
public class AchievementController {

    private static final Logger logger = LoggerFactory.getLogger(AchievementController.class);

    @Autowired
    private AchievementService achievementService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * GET /api/achievements/summary
     * Returns count of unlocked achievements (for badge)
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getAchievementSummary(
            @RequestHeader("Authorization") String authHeader) {

        try {
            User user = getUserFromToken(authHeader);
            if (user == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Please log in to access this feature!"));
            }

            Map<String, Object> summary = achievementService.getUserAchievementSummary(user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("summary", summary);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error getting achievement summary: {}", e.getMessage());
            return ResponseEntity.status(500).body(createErrorResponse("Couldn't load achievements right now. Try refreshing!"));
        }
    }

    /**
     * GET /api/achievements
     * Returns full list of achievements with unlock status
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAchievements(
            @RequestHeader("Authorization") String authHeader) {

        try {
            User user = getUserFromToken(authHeader);
            if (user == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Please log in to access this feature!"));
            }

            List<Map<String, Object>> achievements = achievementService.getUserAchievements(user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("achievements", achievements);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error getting achievements: {}", e.getMessage());
            return ResponseEntity.status(500).body(createErrorResponse("Couldn't load achievements right now. Try refreshing!"));
        }
    }

    /**
     * POST /api/achievements/retroactive
     * Manually trigger retroactive achievement check
     */
    @PostMapping("/retroactive")
    public ResponseEntity<Map<String, Object>> awardRetroactive(
            @RequestHeader("Authorization") String authHeader) {

        try {
            User user = getUserFromToken(authHeader);
            if (user == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Please log in to access this feature!"));
            }

            List<Achievement> newlyUnlocked = achievementService.awardRetroactiveAchievements(user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("newAchievements", newlyUnlocked.size());
            response.put("message", "Awarded " + newlyUnlocked.size() + " achievements");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error awarding retroactive achievements: {}", e.getMessage());
            return ResponseEntity.status(500).body(createErrorResponse("Couldn't award achievements right now. They'll appear next time!"));
        }
    }

    /**
     * Extract user from JWT token
     */
    private User getUserFromToken(String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return null;
            }

            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);

            return userRepository.findById(userId).orElse(null);

        } catch (Exception e) {
            logger.error("Error extracting user from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Create error response
     */
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
}
