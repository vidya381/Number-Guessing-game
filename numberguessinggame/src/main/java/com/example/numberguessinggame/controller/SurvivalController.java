package com.example.numberguessinggame.controller;

import com.example.numberguessinggame.entity.SurvivalSession;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.service.JwtUtil;
import com.example.numberguessinggame.service.SurvivalService;
import com.example.numberguessinggame.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/survival")
public class SurvivalController {

    private static final Logger logger = LoggerFactory.getLogger(SurvivalController.class);
    private static final int SESSION_DURATION_MS = 1800000;  // 30 minutes

    @Autowired
    private SurvivalService survivalService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    // In-memory storage for active sessions
    private final Map<String, SurvivalGameSession> activeSessions = new ConcurrentHashMap<>();

    /**
     * Inner class to track active Survival sessions
     */
    static class SurvivalGameSession {
        private Long userId;  // Null for guests
        private Integer difficulty;
        private LocalDateTime startedAt;
        private Integer currentRound;  // 1-5
        private Integer totalAttemptsUsed;
        private List<RoundResult> roundResults;

        // Current round state
        private Integer currentTargetNumber;
        private Integer currentRoundAttempts;

        public SurvivalGameSession(Long userId, Integer difficulty) {
            this.userId = userId;
            this.difficulty = difficulty;
            this.startedAt = LocalDateTime.now();
            this.currentRound = 1;
            this.totalAttemptsUsed = 0;
            this.roundResults = new ArrayList<>();
            this.currentRoundAttempts = 0;
        }

        public boolean isExpired() {
            return java.time.Duration.between(startedAt, LocalDateTime.now()).toMillis() > SESSION_DURATION_MS;
        }

        // Getters and setters
        public Long getUserId() { return userId; }
        public Integer getDifficulty() { return difficulty; }
        public LocalDateTime getStartedAt() { return startedAt; }
        public Integer getCurrentRound() { return currentRound; }
        public void setCurrentRound(Integer currentRound) { this.currentRound = currentRound; }
        public Integer getTotalAttemptsUsed() { return totalAttemptsUsed; }
        public void setTotalAttemptsUsed(Integer totalAttemptsUsed) { this.totalAttemptsUsed = totalAttemptsUsed; }
        public List<RoundResult> getRoundResults() { return roundResults; }
        public Integer getCurrentTargetNumber() { return currentTargetNumber; }
        public void setCurrentTargetNumber(Integer currentTargetNumber) { this.currentTargetNumber = currentTargetNumber; }
        public Integer getCurrentRoundAttempts() { return currentRoundAttempts; }
        public void setCurrentRoundAttempts(Integer currentRoundAttempts) { this.currentRoundAttempts = currentRoundAttempts; }
    }

    static class RoundResult {
        private Integer roundNumber;
        private Integer attempts;
        private Boolean won;

        public RoundResult(Integer roundNumber, Integer attempts, Boolean won) {
            this.roundNumber = roundNumber;
            this.attempts = attempts;
            this.won = won;
        }

        public Integer getRoundNumber() { return roundNumber; }
        public Integer getAttempts() { return attempts; }
        public Boolean getWon() { return won; }
    }

    /**
     * Start a new Survival session
     * POST /api/survival/start?difficulty={0-2}
     */
    @PostMapping("/start")
    public ResponseEntity<?> startSurvival(
            @RequestParam Integer difficulty,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        // Validate difficulty
        if (difficulty < 0 || difficulty > 2) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid difficulty. Must be 0 (Easy), 1 (Medium), or 2 (Hard)."));
        }

        // Extract userId if authenticated (null for guests)
        Long userId = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                userId = jwtUtil.extractUserId(token);
                userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Please log in to play Survival Mode"));
            }
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Please log in to play Survival Mode"));
        }

        // Create session
        String sessionId = UUID.randomUUID().toString();
        SurvivalGameSession session = new SurvivalGameSession(userId, difficulty);

        // Generate first round target number
        int digitCount = 3 + difficulty;
        session.setCurrentTargetNumber(generateUniqueDigitNumber(digitCount));

        activeSessions.put(sessionId, session);

        // Log session start
        String difficultyName = survivalService.getDifficultyText(difficulty);
        logger.info("[Survival Start] UserID: {} | Difficulty: {} | Target: {} | Session: {}",
                userId, difficultyName, session.getCurrentTargetNumber(), sessionId);

        // Response
        int maxAttempts = survivalService.getMaxAttemptsForDifficulty(difficulty);
        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", sessionId);
        response.put("difficulty", difficulty);
        response.put("digitCount", digitCount);
        response.put("currentRound", 1);
        response.put("totalRounds", 5);
        response.put("maxAttemptsPerRound", maxAttempts);
        response.put("coinsPerRound", survivalService.getCoinsPerRound(difficulty));
        response.put("completionBonus", survivalService.getCompletionBonus(difficulty));

        return ResponseEntity.ok(response);
    }

    /**
     * Submit a guess for the current round
     * POST /api/survival/guess
     */
    @PostMapping("/guess")
    public ResponseEntity<?> submitGuess(@RequestBody Map<String, String> request) {
        try {
            String sessionId = request.get("sessionId");
            String guess = request.get("guess");

            if (sessionId == null || guess == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing session ID or guess"));
            }

            SurvivalGameSession session = activeSessions.get(sessionId);
            if (session == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Session not found or expired"));
            }

            // Validate guess format
            int expectedDigits = 3 + session.getDifficulty();

            if (guess.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Please enter your guess"));
            }

            if (!guess.matches("\\d+")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Only numbers allowed"));
            }

            if (guess.length() != expectedDigits) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Your guess needs exactly " + expectedDigits + " digits"));
            }

            // Check for unique digits
            Set<Character> uniqueDigits = new HashSet<>();
            for (char c : guess.toCharArray()) {
                uniqueDigits.add(c);
            }
            if (uniqueDigits.size() != guess.length()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Each digit must be different"));
            }

            // Calculate bulls and cows
            String target = String.valueOf(session.getCurrentTargetNumber());
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

            // Increment attempts
            session.setCurrentRoundAttempts(session.getCurrentRoundAttempts() + 1);

            // Check if won this round
            boolean wonRound = (bulls == expectedDigits);

            // Check if lost (max attempts reached)
            int maxAttempts = survivalService.getMaxAttemptsForDifficulty(session.getDifficulty());
            boolean lostRound = !wonRound && (session.getCurrentRoundAttempts() >= maxAttempts);

            Map<String, Object> response = new HashMap<>();
            response.put("bulls", bulls);
            response.put("cows", cows);
            response.put("wonRound", wonRound);
            response.put("lostRound", lostRound);
            response.put("currentRoundAttempts", session.getCurrentRoundAttempts());
            response.put("maxAttempts", maxAttempts);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error submitting guess", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not process guess"));
        }
    }

    /**
     * Complete current round (either won or lost)
     * POST /api/survival/round-complete
     */
    @PostMapping("/round-complete")
    public ResponseEntity<?> completeRound(@RequestBody Map<String, Object> request) {
        try {
            String sessionId = (String) request.get("sessionId");
            Boolean won = (Boolean) request.get("won");

            if (sessionId == null || won == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing required fields"));
            }

            SurvivalGameSession session = activeSessions.get(sessionId);
            if (session == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Session not found"));
            }

            // Save round result
            RoundResult result = new RoundResult(
                session.getCurrentRound(),
                session.getCurrentRoundAttempts(),
                won
            );
            session.getRoundResults().add(result);
            session.setTotalAttemptsUsed(session.getTotalAttemptsUsed() + session.getCurrentRoundAttempts());

            Map<String, Object> response = new HashMap<>();

            if (won) {
                // Award coins for this round
                int coinsThisRound = survivalService.getCoinsPerRound(session.getDifficulty());
                response.put("coinsEarned", coinsThisRound);
                response.put("totalCoinsEarned", coinsThisRound * session.getCurrentRound());

                // Check if completed all 5 rounds
                if (session.getCurrentRound() >= 5) {
                    // Completed all 5 rounds - award bonus
                    int completionBonus = survivalService.getCompletionBonus(session.getDifficulty());
                    int totalCoins = (coinsThisRound * 5) + completionBonus;

                    response.put("completed", true);
                    response.put("completionBonus", completionBonus);
                    response.put("totalCoinsEarned", totalCoins);
                    response.put("roundsSurvived", 5);
                } else {
                    // Move to next round
                    session.setCurrentRound(session.getCurrentRound() + 1);
                    session.setCurrentRoundAttempts(0);

                    // Generate new target for next round
                    int digitCount = 3 + session.getDifficulty();
                    session.setCurrentTargetNumber(generateUniqueDigitNumber(digitCount));

                    response.put("completed", false);
                    response.put("nextRound", session.getCurrentRound());
                }
            } else {
                // Lost - game over
                int totalCoins = survivalService.getCoinsPerRound(session.getDifficulty()) * (session.getCurrentRound() - 1);

                response.put("completed", false);
                response.put("gameOver", true);
                response.put("roundsSurvived", session.getCurrentRound() - 1);
                response.put("totalCoinsEarned", totalCoins);
            }

            response.put("totalAttemptsUsed", session.getTotalAttemptsUsed());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error completing round", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not complete round"));
        }
    }

    /**
     * End the survival session and save to database
     * POST /api/survival/end
     */
    @PostMapping("/end")
    public ResponseEntity<?> endSurvival(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> request) {
        try {
            String sessionId = (String) request.get("sessionId");

            if (sessionId == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing session ID"));
            }

            SurvivalGameSession session = activeSessions.get(sessionId);
            if (session == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Session not found"));
            }

            // Calculate final stats
            int roundsSurvived = session.getRoundResults().isEmpty() ? 0 :
                                session.getRoundResults().get(session.getRoundResults().size() - 1).getWon() ?
                                session.getCurrentRound() : session.getCurrentRound() - 1;

            boolean completed = roundsSurvived >= 5;

            int coinsPerRound = survivalService.getCoinsPerRound(session.getDifficulty());
            int totalCoins = coinsPerRound * roundsSurvived;
            if (completed) {
                totalCoins += survivalService.getCompletionBonus(session.getDifficulty());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("roundsSurvived", roundsSurvived);
            response.put("totalAttemptsUsed", session.getTotalAttemptsUsed());
            response.put("completed", completed);
            response.put("coinsEarned", totalCoins);

            // Save to database if authenticated
            Integer rank = null;
            Integer totalCoinsAfter = null;

            if (session.getUserId() != null) {
                try {
                    User user = userService.findById(session.getUserId())
                        .orElseThrow(() -> new IllegalArgumentException("User not found"));

                    // Save session
                    SurvivalSession savedSession = survivalService.saveSurvivalSession(
                        user,
                        session.getDifficulty(),
                        roundsSurvived,
                        session.getTotalAttemptsUsed(),
                        completed,
                        totalCoins,
                        session.getStartedAt()
                    );

                    // Award coins
                    if (totalCoins > 0) {
                        userService.awardCoinsAmount(user.getId(), totalCoins);
                        User updatedUser = userService.findById(user.getId()).orElse(user);
                        totalCoinsAfter = updatedUser.getCoins() != null ? updatedUser.getCoins() : 0;
                    }

                    // Get rank
                    rank = survivalService.getUserRank(savedSession.getId(), session.getDifficulty());

                } catch (Exception e) {
                    logger.error("Error saving survival session", e);
                }
            }

            if (rank != null) {
                response.put("rank", rank);
            }
            if (totalCoinsAfter != null) {
                response.put("totalCoins", totalCoinsAfter);
            }

            // Remove session
            activeSessions.remove(sessionId);

            logger.info("[Survival End] Rounds: {}/5 | Attempts: {} | Coins: {}",
                    roundsSurvived, session.getTotalAttemptsUsed(), totalCoins);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error ending survival session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not end session"));
        }
    }

    /**
     * Get leaderboard
     * GET /api/survival/leaderboard?difficulty={0-2}&limit=100
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<?> getLeaderboard(
            @RequestParam Integer difficulty,
            @RequestParam(defaultValue = "100") Integer limit) {
        try {
            List<SurvivalSession> leaderboard = survivalService.getLeaderboard(difficulty, limit);

            List<Map<String, Object>> response = new ArrayList<>();
            int rank = 1;

            for (SurvivalSession session : leaderboard) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("rank", rank++);
                entry.put("username", session.getUser().getUsername());
                entry.put("roundsSurvived", session.getRoundsSurvived());
                entry.put("totalAttemptsUsed", session.getTotalAttemptsUsed());
                entry.put("completed", session.getCompleted());
                entry.put("completedAt", session.getCompletedAt().toString());
                response.add(entry);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error fetching leaderboard", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not load leaderboard"));
        }
    }

    /**
     * Get user's survival stats
     * GET /api/survival/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getUserStats(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);
            User user = userService.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

            Map<String, Object> stats = survivalService.getUserSurvivalStats(user);

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            logger.error("Error fetching user stats", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not load stats"));
        }
    }

    /**
     * Scheduled cleanup of expired sessions (runs every 10 minutes)
     */
    @Scheduled(fixedRate = 600000)
    public void cleanupExpiredSessions() {
        int removed = 0;
        Iterator<Map.Entry<String, SurvivalGameSession>> iterator = activeSessions.entrySet().iterator();

        while (iterator.hasNext()) {
            Map.Entry<String, SurvivalGameSession> entry = iterator.next();
            if (entry.getValue().isExpired()) {
                iterator.remove();
                removed++;
            }
        }

        if (removed > 0) {
            logger.info("Cleaned up {} expired Survival sessions", removed);
        }
    }

    // Helper method to generate unique digit number
    private int generateUniqueDigitNumber(int digitCount) {
        List<Integer> digits = new ArrayList<>();
        for (int i = 0; i <= 9; i++) {
            digits.add(i);
        }
        Collections.shuffle(digits);

        // Ensure first digit is not 0
        if (digits.get(0) == 0) {
            Collections.swap(digits, 0, 1);
        }

        StringBuilder number = new StringBuilder();
        for (int i = 0; i < digitCount; i++) {
            number.append(digits.get(i));
        }

        return Integer.parseInt(number.toString());
    }
}
