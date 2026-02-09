package com.example.numberguessinggame.controller;

import com.example.numberguessinggame.entity.SurvivalSession;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.UserRepository;
import com.example.numberguessinggame.service.JwtUtil;
import com.example.numberguessinggame.service.SurvivalService;
import com.example.numberguessinggame.service.UserService;
import com.example.numberguessinggame.util.GameUtils;
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
    private UserRepository userRepository;

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
        private Set<Integer> revealedHintPositions;

        public SurvivalGameSession(Long userId, Integer difficulty) {
            this.userId = userId;
            this.difficulty = difficulty;
            this.startedAt = LocalDateTime.now();
            this.currentRound = 1;
            this.totalAttemptsUsed = 0;
            this.roundResults = new ArrayList<>();
            this.currentRoundAttempts = 0;
            this.revealedHintPositions = new HashSet<>();
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
        public Set<Integer> getRevealedHintPositions() { return revealedHintPositions; }
        public void resetRevealedHintPositions() { this.revealedHintPositions = new HashSet<>(); }
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
                String username = jwtUtil.extractUsername(token);
                Optional<User> userOpt = userRepository.findByUsername(username);
                if (userOpt.isPresent()) {
                    userId = userOpt.get().getId();
                }
            } catch (Exception e) {
                logger.warn("Failed to extract user from token: {}", e.getMessage());
                // Continue as guest if token extraction fails
            }
        }
        // If userId is null, user plays as guest

        // Create session
        String sessionId = UUID.randomUUID().toString();
        SurvivalGameSession session = new SurvivalGameSession(userId, difficulty);

        // Generate first round target number
        int digitCount = 3 + difficulty;
        session.setCurrentTargetNumber(GameUtils.generateUniqueDigitNumber(digitCount));

        activeSessions.put(sessionId, session);

        // Log session start
        String difficultyName = survivalService.getDifficultyText(difficulty);
        if (userId != null) {
            userRepository.findById(userId).ifPresent(user ->
                logger.info("[ADMIN] Survival Start | User: {} | Difficulty: {} | Target: {} | Session: {}",
                    user.getUsername(), difficultyName, session.getCurrentTargetNumber(), sessionId)
            );
        } else {
            logger.info("[ADMIN] Survival Start | Guest | Difficulty: {} | Target: {} | Session: {}",
                difficultyName, session.getCurrentTargetNumber(), sessionId);
        }

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
     * Get hint for current round (reveals one digit position for 10 coins)
     * POST /api/survival/get-hint
     */
    @PostMapping("/get-hint")
    public ResponseEntity<?> getHint(
            @RequestBody Map<String, String> request,
            @RequestHeader("Authorization") String authHeader) {

        String sessionId = request.get("sessionId");

        // Validate auth
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Authentication required"));
        }

        // Extract user
        String token = authHeader.substring(7);
        String username;
        try {
            username = jwtUtil.extractUsername(token);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Invalid token"));
        }

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "User not found"));
        }

        User user = userOpt.get();

        // Check coins
        int hintCost = 10;
        Integer userCoins = user.getCoins() != null ? user.getCoins() : 0;
        if (userCoins < hintCost) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "Insufficient coins. Need " + hintCost + " coins."
            ));
        }

        // Get session
        SurvivalGameSession session = activeSessions.get(sessionId);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", "Session not found"));
        }

        if (session.isExpired()) {
            activeSessions.remove(sessionId);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "Session expired"
            ));
        }

        // Get target number and find unrevealed positions
        String target = String.valueOf(session.getCurrentTargetNumber());
        List<Integer> unrevealedPositions = new ArrayList<>();
        for (int i = 0; i < target.length(); i++) {
            if (!session.getRevealedHintPositions().contains(i)) {
                unrevealedPositions.add(i);
            }
        }

        if (unrevealedPositions.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "All digits already revealed"
            ));
        }

        // Select random unrevealed position
        Random random = new Random();
        int position = unrevealedPositions.get(random.nextInt(unrevealedPositions.size()));
        String digit = String.valueOf(target.charAt(position));

        // Deduct coins
        userService.spendCoins(user.getId(), hintCost);
        User updatedUser = userService.findById(user.getId()).orElse(user);
        int remainingCoins = updatedUser.getCoins() != null ? updatedUser.getCoins() : 0;

        // Mark position as revealed
        session.getRevealedHintPositions().add(position);

        logger.info("Survival hint purchased - User: {}, Session: {}, Round: {}, Position: {}, Digit: {}, Coins: {} -> {}",
                username, sessionId, session.getCurrentRound(), position, digit, userCoins, remainingCoins);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "position", position,
                "digit", digit,
                "remainingCoins", remainingCoins
        ));
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
                    session.resetRevealedHintPositions();

                    // Generate new target for next round
                    int digitCount = 3 + session.getDifficulty();
                    session.setCurrentTargetNumber(GameUtils.generateUniqueDigitNumber(digitCount));

                    // Log new round start
                    String difficultyName = survivalService.getDifficultyText(session.getDifficulty());
                    if (session.getUserId() != null) {
                        userRepository.findById(session.getUserId()).ifPresent(user ->
                            logger.info("[ADMIN] Survival Round {} | User: {} | Difficulty: {} | Target: {} | Session: {}",
                                    session.getCurrentRound(), user.getUsername(), difficultyName,
                                    session.getCurrentTargetNumber(), sessionId)
                        );
                    } else {
                        logger.info("[ADMIN] Survival Round {} | Guest | Difficulty: {} | Target: {} | Session: {}",
                                session.getCurrentRound(), difficultyName,
                                session.getCurrentTargetNumber(), sessionId);
                    }

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

            // Calculate final stats - count how many rounds were actually won
            int roundsSurvived = (int) session.getRoundResults().stream()
                    .filter(RoundResult::getWon)
                    .count();

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
                    Optional<User> userOpt = userService.findById(session.getUserId());
                    if (userOpt.isEmpty()) {
                        logger.warn("User {} not found when saving survival session", session.getUserId());
                        // Continue without saving - treat as guest
                    } else {
                        User user = userOpt.get();

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
                    }

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

}
