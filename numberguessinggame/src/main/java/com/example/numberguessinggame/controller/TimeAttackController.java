package com.example.numberguessinggame.controller;

import com.example.numberguessinggame.entity.TimeAttackSession;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.UserRepository;
import com.example.numberguessinggame.service.JwtUtil;
import com.example.numberguessinggame.service.TimeAttackService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/time-attack")
public class TimeAttackController {

    private static final Logger logger = LoggerFactory.getLogger(TimeAttackController.class);
    private static final int SESSION_DURATION_MS = 300000;  // 5 minutes

    @Autowired
    private TimeAttackService timeAttackService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    // In-memory storage for active sessions
    private final Map<String, TimeAttackGameSession> activeSessions = new ConcurrentHashMap<>();

    /**
     * Inner class to track active Time Attack sessions
     */
    static class TimeAttackGameSession {
        private Long userId;  // Null for guests
        private Integer difficulty;
        private Long sessionStartTime;
        private Integer totalScore;
        private Integer gamesWon;
        private Integer gamesPlayed;
        private List<GameResult> gameResults;

        // Current game state
        private Integer currentTargetNumber;
        private Long currentGameStartTime;
        private Integer currentGameAttempts;

        public TimeAttackGameSession(Long userId, Integer difficulty) {
            this.userId = userId;
            this.difficulty = difficulty;
            this.sessionStartTime = System.currentTimeMillis();
            this.totalScore = 0;
            this.gamesWon = 0;
            this.gamesPlayed = 0;
            this.gameResults = new ArrayList<>();
            this.currentGameAttempts = 0;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() - sessionStartTime > SESSION_DURATION_MS;
        }

        public long getRemainingTimeMs() {
            long elapsed = System.currentTimeMillis() - sessionStartTime;
            return Math.max(0, SESSION_DURATION_MS - elapsed);
        }

        // Getters and setters
        public Long getUserId() { return userId; }
        public Integer getDifficulty() { return difficulty; }
        public Long getSessionStartTime() { return sessionStartTime; }
        public Integer getTotalScore() { return totalScore; }
        public void setTotalScore(Integer totalScore) { this.totalScore = totalScore; }
        public Integer getGamesWon() { return gamesWon; }
        public void setGamesWon(Integer gamesWon) { this.gamesWon = gamesWon; }
        public Integer getGamesPlayed() { return gamesPlayed; }
        public void setGamesPlayed(Integer gamesPlayed) { this.gamesPlayed = gamesPlayed; }
        public List<GameResult> getGameResults() { return gameResults; }
        public Integer getCurrentTargetNumber() { return currentTargetNumber; }
        public void setCurrentTargetNumber(Integer currentTargetNumber) { this.currentTargetNumber = currentTargetNumber; }
        public Long getCurrentGameStartTime() { return currentGameStartTime; }
        public void setCurrentGameStartTime(Long currentGameStartTime) { this.currentGameStartTime = currentGameStartTime; }
        public Integer getCurrentGameAttempts() { return currentGameAttempts; }
        public void setCurrentGameAttempts(Integer currentGameAttempts) { this.currentGameAttempts = currentGameAttempts; }
        public void incrementCurrentGameAttempts() { this.currentGameAttempts++; }
    }

    static class GameResult {
        private Integer attempts;
        private Integer timeSeconds;
        private Integer points;
        private Boolean won;

        public GameResult(Integer attempts, Integer timeSeconds, Integer points, Boolean won) {
            this.attempts = attempts;
            this.timeSeconds = timeSeconds;
            this.points = points;
            this.won = won;
        }

        public Integer getAttempts() { return attempts; }
        public Integer getTimeSeconds() { return timeSeconds; }
        public Integer getPoints() { return points; }
        public Boolean getWon() { return won; }
    }

    /**
     * Start a new Time Attack session
     * POST /api/time-attack/start?difficulty={0-2}
     */
    @PostMapping("/start")
    public ResponseEntity<?> startTimeAttack(
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
            }
        }

        // Generate unique session ID
        String sessionId = UUID.randomUUID().toString();

        // Create session
        TimeAttackGameSession session = new TimeAttackGameSession(userId, difficulty);

        // Generate first game's target number
        int digitCount = 3 + difficulty;
        session.setCurrentTargetNumber(generateUniqueDigitNumber(digitCount));
        session.setCurrentGameStartTime(System.currentTimeMillis());

        // Store in active sessions
        activeSessions.put(sessionId, session);

        logger.info("Time Attack session started - SessionID: {}, UserID: {}, Difficulty: {}",
                sessionId, userId, difficulty);

        return ResponseEntity.ok(Map.of(
                "sessionId", sessionId,
                "difficulty", difficulty,
                "digitCount", digitCount,
                "isGuest", userId == null
        ));
    }

    /**
     * Start a new game within the session (after winning previous game)
     * POST /api/time-attack/start-game?sessionId={id}
     */
    @PostMapping("/start-game")
    public ResponseEntity<?> startNewGame(@RequestParam String sessionId) {
        TimeAttackGameSession session = activeSessions.get(sessionId);

        if (session == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Session not found"));
        }

        if (session.isExpired()) {
            activeSessions.remove(sessionId);
            return ResponseEntity.ok(Map.of(
                    "expired", true,
                    "finalScore", session.getTotalScore()
            ));
        }

        // Generate new target number
        int digitCount = 3 + session.getDifficulty();
        session.setCurrentTargetNumber(generateUniqueDigitNumber(digitCount));
        session.setCurrentGameStartTime(System.currentTimeMillis());
        session.setCurrentGameAttempts(0);

        return ResponseEntity.ok(Map.of(
                "digitCount", digitCount,
                "remainingTimeMs", session.getRemainingTimeMs()
        ));
    }

    /**
     * Submit a guess for the current game
     * POST /api/time-attack/guess
     */
    @PostMapping("/guess")
    public ResponseEntity<?> submitGuess(@RequestBody Map<String, String> request) {
        String sessionId = request.get("sessionId");
        String guess = request.get("guess");

        TimeAttackGameSession session = activeSessions.get(sessionId);

        if (session == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Session not found"));
        }

        if (session.isExpired()) {
            activeSessions.remove(sessionId);
            return ResponseEntity.ok(Map.of(
                    "expired", true,
                    "finalScore", session.getTotalScore()
            ));
        }

        // Validate guess
        int digitCount = 3 + session.getDifficulty();
        if (guess == null || guess.length() != digitCount) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Guess must be " + digitCount + " digits"));
        }

        if (!guess.matches("\\d+")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Guess must contain only digits"));
        }

        // Check for unique digits
        Set<Character> uniqueDigits = new HashSet<>();
        for (char c : guess.toCharArray()) {
            uniqueDigits.add(c);
        }
        if (uniqueDigits.size() != guess.length()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "All digits must be unique"));
        }

        // Increment attempts
        session.incrementCurrentGameAttempts();

        // Calculate bulls and cows
        String target = String.valueOf(session.getCurrentTargetNumber());
        int bulls = 0;
        int cows = 0;

        for (int i = 0; i < guess.length(); i++) {
            char guessChar = guess.charAt(i);
            if (target.charAt(i) == guessChar) {
                bulls++;
            } else if (target.contains(String.valueOf(guessChar))) {
                cows++;
            }
        }

        boolean won = (bulls == digitCount);

        if (won) {
            // Calculate game time
            long gameTimeMs = System.currentTimeMillis() - session.getCurrentGameStartTime();
            int gameTimeSeconds = (int) (gameTimeMs / 1000);

            // Calculate points
            int points = timeAttackService.calculateGamePoints(
                    session.getDifficulty(),
                    session.getCurrentGameAttempts(),
                    gameTimeSeconds
            );

            // Update session stats
            session.setTotalScore(session.getTotalScore() + points);
            session.setGamesWon(session.getGamesWon() + 1);
            session.setGamesPlayed(session.getGamesPlayed() + 1);

            // Record game result
            session.getGameResults().add(new GameResult(
                    session.getCurrentGameAttempts(),
                    gameTimeSeconds,
                    points,
                    true
            ));

            logger.info("Time Attack game won - SessionID: {}, Attempts: {}, Time: {}s, Points: {}",
                    sessionId, session.getCurrentGameAttempts(), gameTimeSeconds, points);

            return ResponseEntity.ok(Map.of(
                    "bulls", bulls,
                    "cows", cows,
                    "won", true,
                    "attempts", session.getCurrentGameAttempts(),
                    "points", points,
                    "totalScore", session.getTotalScore(),
                    "gamesWon", session.getGamesWon()
            ));
        } else {
            return ResponseEntity.ok(Map.of(
                    "bulls", bulls,
                    "cows", cows,
                    "won", false,
                    "attempts", session.getCurrentGameAttempts()
            ));
        }
    }

    /**
     * End Time Attack session and save results (if authenticated)
     * POST /api/time-attack/end?sessionId={id}
     */
    @PostMapping("/end")
    public ResponseEntity<?> endTimeAttack(
            @RequestParam String sessionId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        TimeAttackGameSession session = activeSessions.get(sessionId);

        if (session == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Session not found"));
        }

        // Calculate final stats
        List<GameResult> wonGames = session.getGameResults().stream()
                .filter(GameResult::getWon)
                .collect(Collectors.toList());

        Double averageAttempts = null;
        Integer fastestWinSeconds = null;

        if (!wonGames.isEmpty()) {
            averageAttempts = wonGames.stream()
                    .mapToInt(GameResult::getAttempts)
                    .average()
                    .orElse(0.0);

            fastestWinSeconds = wonGames.stream()
                    .mapToInt(GameResult::getTimeSeconds)
                    .min()
                    .orElse(0);
        }

        // Save to database if authenticated
        Integer rank = null;
        if (session.getUserId() != null) {
            try {
                Optional<User> userOpt = userRepository.findById(session.getUserId());
                if (userOpt.isPresent()) {
                    // Convert game results to JSON
                    String gameDetailsJson = convertGameResultsToJson(session.getGameResults());

                    TimeAttackSession savedSession = timeAttackService.saveSession(
                            userOpt.get(),
                            session.getDifficulty(),
                            session.getTotalScore(),
                            session.getGamesWon(),
                            session.getGamesPlayed(),
                            averageAttempts,
                            fastestWinSeconds,
                            gameDetailsJson
                    );

                    // Calculate rank
                    rank = timeAttackService.getUserRank(savedSession.getId(), session.getDifficulty());
                }
            } catch (Exception e) {
                logger.error("Failed to save Time Attack session: {}", e.getMessage(), e);
            }
        }

        // Remove from active sessions
        activeSessions.remove(sessionId);

        Map<String, Object> response = new HashMap<>();
        response.put("totalScore", session.getTotalScore());
        response.put("gamesWon", session.getGamesWon());
        response.put("gamesPlayed", session.getGamesPlayed());
        response.put("averageAttempts", averageAttempts);
        response.put("fastestWinSeconds", fastestWinSeconds);
        response.put("gameDetails", session.getGameResults());
        if (rank != null) {
            response.put("rank", rank);
        }

        logger.info("Time Attack session ended - SessionID: {}, Score: {}, Wins: {}/{}",
                sessionId, session.getTotalScore(), session.getGamesWon(), session.getGamesPlayed());

        return ResponseEntity.ok(response);
    }

    /**
     * Get leaderboard for a specific difficulty
     * GET /api/time-attack/leaderboard/{difficulty}
     */
    @GetMapping("/leaderboard/{difficulty}")
    public ResponseEntity<?> getLeaderboard(
            @PathVariable Integer difficulty,
            @RequestParam(defaultValue = "50") int limit) {

        if (difficulty < 0 || difficulty > 2) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid difficulty"));
        }

        List<TimeAttackSession> leaderboard = timeAttackService.getLeaderboard(difficulty, limit);

        List<Map<String, Object>> formattedLeaderboard = new ArrayList<>();
        int rank = 1;
        for (TimeAttackSession session : leaderboard) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("rank", rank++);
            entry.put("username", session.getUser().getUsername());
            entry.put("totalScore", session.getTotalScore());
            entry.put("gamesWon", session.getGamesWon());
            entry.put("gamesPlayed", session.getGamesPlayed());
            entry.put("averageAttempts", session.getAverageAttempts());
            entry.put("playedAt", session.getPlayedAt());
            formattedLeaderboard.add(entry);
        }

        return ResponseEntity.ok(formattedLeaderboard);
    }

    /**
     * Get user statistics
     * GET /api/time-attack/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getUserStats(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);
            Optional<User> userOpt = userRepository.findByUsername(username);

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not found"));
            }

            Map<String, Object> stats = timeAttackService.getUserStats(userOpt.get());
            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            logger.error("Failed to get user stats: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve stats"));
        }
    }

    /**
     * Scheduled cleanup of expired sessions (runs every 10 minutes)
     */
    @Scheduled(fixedRate = 600000)
    public void cleanupExpiredSessions() {
        int removed = 0;
        Iterator<Map.Entry<String, TimeAttackGameSession>> iterator = activeSessions.entrySet().iterator();

        while (iterator.hasNext()) {
            Map.Entry<String, TimeAttackGameSession> entry = iterator.next();
            if (entry.getValue().isExpired()) {
                iterator.remove();
                removed++;
            }
        }

        if (removed > 0) {
            logger.info("Cleaned up {} expired Time Attack sessions", removed);
        }
    }

    /**
     * Generate a unique-digit number
     */
    private int generateUniqueDigitNumber(int digitCount) {
        List<Integer> digits = new ArrayList<>();
        for (int i = 0; i <= 9; i++) {
            digits.add(i);
        }
        Collections.shuffle(digits);

        // Ensure first digit is not 0
        List<Integer> selectedDigits = new ArrayList<>();
        for (int digit : digits) {
            if (selectedDigits.isEmpty() && digit == 0) {
                continue;
            }
            selectedDigits.add(digit);
            if (selectedDigits.size() == digitCount) {
                break;
            }
        }

        int result = 0;
        for (int digit : selectedDigits) {
            result = result * 10 + digit;
        }

        return result;
    }

    /**
     * Convert game results to JSON string
     */
    private String convertGameResultsToJson(List<GameResult> gameResults) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            return objectMapper.writeValueAsString(gameResults);
        } catch (JsonProcessingException e) {
            logger.error("Failed to convert game results to JSON", e);
            return "[]";
        }
    }
}
