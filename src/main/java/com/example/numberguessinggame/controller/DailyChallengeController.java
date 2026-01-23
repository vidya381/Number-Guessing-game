package com.example.numberguessinggame.controller;

import com.example.numberguessinggame.entity.DailyChallenge;
import com.example.numberguessinggame.entity.DailyChallengeAttempt;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.service.DailyChallengeService;
import com.example.numberguessinggame.service.JwtUtil;
import com.example.numberguessinggame.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/daily-challenge")
public class DailyChallengeController {

    private static final Logger logger = LoggerFactory.getLogger(DailyChallengeController.class);
    private static final int SESSION_DURATION_MS = 1800000;  // 30 minutes

    @Autowired
    private DailyChallengeService dailyChallengeService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    // Store active daily challenge sessions
    private final Map<String, DailyChallengeSession> activeSessions = new ConcurrentHashMap<>();

    // Store cumulative attempts per user per day (userId-date -> attempts)
    private final Map<String, Integer> dailyAttempts = new ConcurrentHashMap<>();

    /**
     * Get today's daily challenge info
     * Returns challenge details and user's status
     */
    @GetMapping("/info")
    public ResponseEntity<?> getDailyChallengeInfo(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // Get today's challenge (create if doesn't exist)
            DailyChallenge challenge = dailyChallengeService.getTodayChallenge();

            Map<String, Object> response = new HashMap<>();
            response.put("challengeDate", challenge.getChallengeDate().toString());
            response.put("difficulty", challenge.getDifficulty());
            response.put("difficultyText", dailyChallengeService.getDifficultyText(challenge.getDifficulty()));
            response.put("digitCount", 3 + challenge.getDifficulty());

            // If user is logged in, check if they've attempted
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    Long userId = jwtUtil.extractUserId(token);
                    User user = userService.findById(userId)
                        .orElseThrow(() -> new IllegalArgumentException("User not found"));

                    boolean attempted = dailyChallengeService.hasUserAttemptedToday(user);
                    response.put("alreadyAttempted", attempted);

                    if (attempted) {
                        Optional<DailyChallengeAttempt> userAttempt = dailyChallengeService.getUserAttemptToday(user);
                        if (userAttempt.isPresent()) {
                            DailyChallengeAttempt attempt = userAttempt.get();
                            Map<String, Object> attemptInfo = new HashMap<>();
                            attemptInfo.put("attempts", attempt.getAttempts());
                            attemptInfo.put("won", attempt.getWon());
                            attemptInfo.put("timeDisplay", attempt.getTimeDisplay());
                            attemptInfo.put("completedAt", attempt.getCompletedAt().toString());

                            if (attempt.getWon()) {
                                Integer rank = dailyChallengeService.getUserRankToday(user);
                                attemptInfo.put("rank", rank);
                            }

                            response.put("userAttempt", attemptInfo);
                        }
                    }
                } catch (Exception e) {
                    // Invalid token, just don't include user-specific info
                }
            } else {
                response.put("alreadyAttempted", false);
            }

            // Global stats
            response.put("totalPlayers", dailyChallengeService.getTodayWinnersCount());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Couldn't load today's challenge. Try refreshing! 🎯"));
        }
    }

    /**
     * Start today's daily challenge
     * Creates a game session and returns session ID
     */
    @PostMapping("/start")
    public ResponseEntity<?> startDailyChallenge(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Please log in to play the daily challenge! 🔑"));
            }

            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);
            User user = userService.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Couldn't find your account. Try logging in again! 👤"));

            // Check if user already attempted today
            if (dailyChallengeService.hasUserAttemptedToday(user)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "You've already completed today's challenge! Come back tomorrow! 📅"));
            }

            // Get today's challenge
            DailyChallenge challenge = dailyChallengeService.getTodayChallenge();

            // Get cumulative attempts for this user today
            String attemptKey = userId + "-" + challenge.getChallengeDate().toString();
            int cumulativeAttempts = dailyAttempts.getOrDefault(attemptKey, 0);

            // Create session with cumulative attempts
            String sessionId = UUID.randomUUID().toString();
            DailyChallengeSession session = new DailyChallengeSession(
                userId,
                challenge.getTargetNumber(),
                challenge.getDifficulty(),
                System.currentTimeMillis(),
                cumulativeAttempts,
                attemptKey
            );
            activeSessions.put(sessionId, session);

            // Log target number for reference
            String difficultyName = challenge.getDifficulty() == 0 ? "Easy" : challenge.getDifficulty() == 1 ? "Medium" : "Hard";
            logger.info("[ADMIN] Daily Challenge Start | User: {} | Difficulty: {} | Target: {} | Session: {} | Attempts: {}",
                user.getUsername(), difficultyName, challenge.getTargetNumber(), sessionId, cumulativeAttempts);

            Map<String, Object> response = new HashMap<>();
            response.put("sessionId", sessionId);
            response.put("difficulty", challenge.getDifficulty());
            response.put("digitCount", 3 + challenge.getDifficulty());
            response.put("maxAttempts", 10);
            response.put("currentAttempts", cumulativeAttempts);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Couldn't start the daily challenge. Try again! 🎮"));
        }
    }

    /**
     * Submit a guess for the daily challenge
     */
    @PostMapping("/guess")
    public ResponseEntity<?> submitGuess(
        @RequestHeader("Authorization") String authHeader,
        @RequestBody Map<String, String> request
    ) {
        try {
            String sessionId = request.get("sessionId");
            String guess = request.get("guess");

            if (sessionId == null || guess == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Missing session ID or guess! 🎯"));
            }

            DailyChallengeSession session = activeSessions.get(sessionId);
            if (session == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Your game session expired. Let's start a new one! 🎮"));
            }

            // Validate guess format
            int expectedDigits = 3 + session.getDifficulty();

            if (guess.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Please enter your guess! 🔢"));
            }

            if (!guess.matches("\\d+")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Only numbers allowed in your guess! 🔢"));
            }

            if (guess.length() != expectedDigits) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Your guess needs exactly " + expectedDigits + " digits! 🎯"));
            }

            // Check for unique digits
            Set<Character> uniqueDigits = new HashSet<>();
            for (char c : guess.toCharArray()) {
                uniqueDigits.add(c);
            }
            if (uniqueDigits.size() != guess.length()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Each digit must be different. No repeats! 🔢"));
            }

            // Calculate bulls and cows
            String target = String.valueOf(session.getTargetNumber());
            int bulls = 0;
            int cows = 0;

            for (int i = 0; i < guess.length(); i++) {
                char guessChar = guess.charAt(i);
                if (guessChar == target.charAt(i)) {
                    bulls++;
                } else if (target.contains(String.valueOf(guessChar))) {
                    cows++;
                }
            }

            // Increment attempts (both in session and cumulative map)
            session.incrementAttempts();
            dailyAttempts.put(session.getAttemptKey(), session.getAttempts());

            // Check if won
            boolean won = (bulls == expectedDigits);

            Map<String, Object> response = new HashMap<>();
            response.put("bulls", bulls);
            response.put("cows", cows);
            response.put("won", won);
            response.put("attempts", session.getAttempts());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Hmm, couldn't submit that guess. Check your connection and try again! 🔄"));
        }
    }

    /**
     * End the daily challenge and save result
     */
    @PostMapping("/end")
    public ResponseEntity<?> endDailyChallenge(
        @RequestHeader("Authorization") String authHeader,
        @RequestBody Map<String, Object> request
    ) {
        try {
            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);
            User user = userService.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Couldn't find your account. Try logging in again! 👤"));

            String sessionId = (String) request.get("sessionId");
            Boolean won = (Boolean) request.get("won");
            Integer timeTakenSeconds = (Integer) request.get("timeTakenSeconds");
            String timeDisplay = (String) request.get("timeDisplay");

            if (sessionId == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Missing session ID! 🎯"));
            }

            DailyChallengeSession session = activeSessions.get(sessionId);
            if (session == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Your game session expired. Let's start a new one! 🎮"));
            }

            // Verify user owns this session
            if (!session.getUserId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "This isn't your game session! 🚫"));
            }

            // Save attempt
            DailyChallengeAttempt attempt = dailyChallengeService.saveAttempt(
                user,
                session.getAttempts(),
                won != null ? won : false,
                timeTakenSeconds != null ? timeTakenSeconds : 0,
                timeDisplay != null ? timeDisplay : "00:00"
            );

            // Remove session
            activeSessions.remove(sessionId);

            // If won, clear cumulative attempts for this user today
            if (won != null && won) {
                dailyAttempts.remove(session.getAttemptKey());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);

            // If won, attempt will have data; if lost, attempt is null
            if (attempt != null && attempt.getWon()) {
                response.put("attempts", attempt.getAttempts());
                response.put("won", attempt.getWon());

                Integer rank = dailyChallengeService.getUserRankToday(user);
                response.put("rank", rank);
                response.put("totalPlayers", dailyChallengeService.getTodayWinnersCount());

                // Award coins for completing the daily challenge
                int coinsAwarded = userService.awardCoins(user.getId(), session.getDifficulty());
                response.put("coinsAwarded", coinsAwarded);

                // Get updated user with new coin total
                User updatedUser = userService.findById(user.getId()).orElse(user);
                response.put("totalCoins", updatedUser.getCoins() != null ? updatedUser.getCoins() : 0);
            } else {
                // Lost - return cumulative attempts from session
                response.put("attempts", session.getAttempts());
                response.put("won", false);
            }

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            // Already attempted
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Couldn't save your result. Try again! 💾"));
        }
    }

    /**
     * Get today's leaderboard
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<?> getLeaderboard(@RequestParam(defaultValue = "100") int limit) {
        try {
            List<DailyChallengeAttempt> leaderboard = dailyChallengeService.getTodayLeaderboard(limit);

            List<Map<String, Object>> response = new ArrayList<>();
            int rank = 1;

            for (DailyChallengeAttempt attempt : leaderboard) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("rank", rank++);
                entry.put("username", attempt.getUser().getUsername());
                entry.put("attempts", attempt.getAttempts());
                entry.put("timeDisplay", attempt.getTimeDisplay());
                entry.put("completedAt", attempt.getCompletedAt().toString());
                response.add(entry);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Couldn't load the leaderboard. Try again in a moment! 🏆"));
        }
    }

    /**
     * Get user's daily challenge stats
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getUserStats(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Please log in to see your stats! 🔑"));
            }

            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);
            User user = userService.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Couldn't find your account. Try logging in again! 👤"));

            Map<String, Object> stats = dailyChallengeService.getUserDailyChallengeStats(user);

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Couldn't load your stats. Try refreshing! 📊"));
        }
    }

    /**
     * Scheduled cleanup of expired sessions (runs every 10 minutes)
     */
    @Scheduled(fixedRate = 600000)
    public void cleanupExpiredSessions() {
        int removed = 0;
        Iterator<Map.Entry<String, DailyChallengeSession>> iterator = activeSessions.entrySet().iterator();

        while (iterator.hasNext()) {
            Map.Entry<String, DailyChallengeSession> entry = iterator.next();
            if (entry.getValue().isExpired()) {
                iterator.remove();
                removed++;
            }
        }

        if (removed > 0) {
            logger.info("Cleaned up {} expired Daily Challenge sessions", removed);
        }
    }

    /**
     * Session data class
     */
    private static class DailyChallengeSession {
        private final Long userId;
        private final Integer targetNumber;
        private final Integer difficulty;
        private final Long startTime;
        private final String attemptKey;
        private int attempts;

        public DailyChallengeSession(Long userId, Integer targetNumber, Integer difficulty, Long startTime, int initialAttempts, String attemptKey) {
            this.userId = userId;
            this.targetNumber = targetNumber;
            this.difficulty = difficulty;
            this.startTime = startTime;
            this.attempts = initialAttempts;
            this.attemptKey = attemptKey;
        }

        public Long getUserId() {
            return userId;
        }

        public Integer getTargetNumber() {
            return targetNumber;
        }

        public Integer getDifficulty() {
            return difficulty;
        }

        public Long getStartTime() {
            return startTime;
        }

        public int getAttempts() {
            return attempts;
        }

        public String getAttemptKey() {
            return attemptKey;
        }

        public void incrementAttempts() {
            this.attempts++;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() - startTime > SESSION_DURATION_MS;
        }
    }
}
