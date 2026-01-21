package com.example.numberguessinggame.service;

import com.example.numberguessinggame.entity.*;
import com.example.numberguessinggame.repository.*;
import com.example.numberguessinggame.util.GameUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class MultiplayerService {

    private static final Logger logger = LoggerFactory.getLogger(MultiplayerService.class);

    @Autowired
    private MultiplayerChallengeRepository challengeRepository;

    @Autowired
    private MultiplayerGameSessionRepository sessionRepository;

    @Autowired
    private MultiplayerPlayerProgressRepository progressRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendsService friendsService;

    @Autowired
    private UserService userService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // In-memory session tracking (ConcurrentHashMap for thread safety)
    private final Map<String, ActiveGameSession> activeSessions = new ConcurrentHashMap<>();

    /**
     * Active game session data stored in memory
     */
    static class ActiveGameSession {
        String sessionId;
        Long player1Id;
        Long player2Id;
        Integer secretNumber;
        Integer digitCount;
        Integer difficulty;
        Integer maxAttempts;
        LocalDateTime startedAt;
        Map<Long, PlayerState> playerStates;

        static class PlayerState {
            Integer attempts = 0;
            Boolean solved = false;
            LocalDateTime solvedAt;
            LocalDateTime lastActivity;
        }

        ActiveGameSession(String sessionId, Long player1Id, Long player2Id,
                          Integer secretNumber, Integer digitCount, Integer difficulty, Integer maxAttempts) {
            this.sessionId = sessionId;
            this.player1Id = player1Id;
            this.player2Id = player2Id;
            this.secretNumber = secretNumber;
            this.digitCount = digitCount;
            this.difficulty = difficulty;
            this.maxAttempts = maxAttempts;
            this.startedAt = LocalDateTime.now();
            this.playerStates = new ConcurrentHashMap<>();

            // Initialize player states
            PlayerState state1 = new PlayerState();
            state1.lastActivity = LocalDateTime.now();
            PlayerState state2 = new PlayerState();
            state2.lastActivity = LocalDateTime.now();

            playerStates.put(player1Id, state1);
            playerStates.put(player2Id, state2);
        }
    }

    /**
     * Get max attempts for a difficulty level
     */
    private Integer getMaxAttemptsForDifficulty(Integer difficulty) {
        return switch(difficulty) {
            case 0 -> 7;   // Easy: 3 digits, 7 attempts
            case 1 -> 10;  // Medium: 4 digits, 10 attempts
            case 2 -> 13;  // Hard: 5 digits, 13 attempts
            default -> 7;
        };
    }

    /**
     * Create a new multiplayer challenge
     */
    @Transactional
    public Map<String, Object> createChallenge(User challenger, Long challengedId, Integer difficulty) {
        // Validate difficulty
        if (difficulty < 0 || difficulty > 2) {
            throw new IllegalArgumentException("Difficulty must be 0 (Easy), 1 (Medium), or 2 (Hard)");
        }

        // Verify challenged user exists
        User challenged = userRepository.findById(challengedId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Can't challenge yourself
        if (challenger.getId().equals(challengedId)) {
            throw new IllegalArgumentException("You cannot challenge yourself");
        }

        // Verify they are friends
        if (!friendsService.areFriends(challenger.getId(), challengedId)) {
            throw new IllegalArgumentException("You can only challenge friends");
        }

        // Check for existing pending challenge between these users
        LocalDateTime now = LocalDateTime.now();
        if (challengeRepository.findPendingChallengeBetweenUsers(
                challenger.getId(), challengedId, now).isPresent()) {
            throw new IllegalArgumentException("A pending challenge already exists between you and this user");
        }

        // Create challenge
        MultiplayerChallenge challenge = new MultiplayerChallenge(challenger, challenged, difficulty);
        challengeRepository.save(challenge);

        logger.info("Challenge created: {} challenged {} (difficulty {})",
                    challenger.getUsername(), challenged.getUsername(), difficulty);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Challenge sent successfully");
        result.put("challengeId", challenge.getId());
        result.put("expiresAt", challenge.getExpiresAt());
        return result;
    }

    /**
     * Accept a challenge and create game session
     */
    @Transactional
    public Map<String, Object> acceptChallenge(User user, Long challengeId) {
        // Find challenge and verify user is the challenged party
        MultiplayerChallenge challenge = challengeRepository.findByIdAndChallengedId(challengeId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Challenge not found"));

        // Check status
        if (challenge.getStatus() != MultiplayerChallenge.Status.PENDING) {
            throw new IllegalArgumentException("This challenge has already been processed");
        }

        // Check expiration
        if (challenge.isExpired()) {
            challenge.setStatus(MultiplayerChallenge.Status.EXPIRED);
            challengeRepository.save(challenge);
            throw new IllegalArgumentException("This challenge has expired");
        }

        // Update challenge status
        challenge.setStatus(MultiplayerChallenge.Status.ACCEPTED);
        challengeRepository.save(challenge);

        // Create game session
        String sessionId = UUID.randomUUID().toString();
        Integer difficulty = challenge.getDifficulty();
        Integer digitCount = getDigitCountForDifficulty(difficulty);
        Integer secretNumber = GameUtils.generateUniqueDigitNumber(digitCount);

        // Save to database
        MultiplayerGameSession dbSession = new MultiplayerGameSession(
            sessionId,
            challenge.getChallenger(),
            user,
            difficulty,
            digitCount,
            secretNumber
        );
        sessionRepository.save(dbSession);

        // Create player progress records
        MultiplayerPlayerProgress progress1 = new MultiplayerPlayerProgress(dbSession, challenge.getChallenger());
        MultiplayerPlayerProgress progress2 = new MultiplayerPlayerProgress(dbSession, user);
        progressRepository.save(progress1);
        progressRepository.save(progress2);

        // Add to in-memory tracking
        Integer maxAttempts = getMaxAttemptsForDifficulty(difficulty);
        ActiveGameSession activeSession = new ActiveGameSession(
            sessionId,
            challenge.getChallenger().getId(),
            user.getId(),
            secretNumber,
            digitCount,
            difficulty,
            maxAttempts
        );
        activeSessions.put(sessionId, activeSession);

        logger.info("Game session created: {} vs {} (session: {}, max attempts: {})",
                    challenge.getChallenger().getUsername(), user.getUsername(), sessionId, maxAttempts);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Challenge accepted - game started");
        result.put("sessionId", sessionId);
        result.put("digitCount", digitCount);
        result.put("difficulty", difficulty);
        result.put("maxAttempts", maxAttempts);
        result.put("opponentId", challenge.getChallenger().getId());
        result.put("opponentUsername", challenge.getChallenger().getUsername());

        return result;
    }

    /**
     * Submit a guess for a multiplayer game
     */
    @Transactional
    public Map<String, Object> submitGuess(User user, String sessionId, String guess) {
        // Get active session
        ActiveGameSession session = activeSessions.get(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("Game session not found or expired");
        }

        // Verify user is in this game
        if (!user.getId().equals(session.player1Id) && !user.getId().equals(session.player2Id)) {
            throw new IllegalArgumentException("You are not a player in this game");
        }

        ActiveGameSession.PlayerState playerState = session.playerStates.get(user.getId());
        if (playerState.solved) {
            throw new IllegalArgumentException("You have already solved the puzzle");
        }

        // Check if player has reached max attempts
        if (playerState.attempts >= session.maxAttempts) {
            throw new IllegalArgumentException("You have used all your attempts");
        }

        // Validate guess
        if (guess == null || guess.isEmpty()) {
            throw new IllegalArgumentException("Please enter your guess");
        }
        if (!guess.matches("\\d+")) {
            throw new IllegalArgumentException("Only numbers allowed in your guess");
        }
        if (guess.length() != session.digitCount) {
            throw new IllegalArgumentException("Your guess needs exactly " + session.digitCount + " digits");
        }
        if (guess.chars().distinct().count() != guess.length()) {
            throw new IllegalArgumentException("Each digit must be different. No repeats");
        }

        // Calculate bulls and cows
        int[] target = getDigits(session.secretNumber);
        int[] guessDigits = getDigits(Integer.parseInt(guess));
        int bulls = 0;
        int cows = 0;
        boolean[] used = new boolean[target.length];

        // First pass: Check for bulls (correct position)
        for (int i = 0; i < target.length; i++) {
            if (guessDigits[i] == target[i]) {
                bulls++;
                used[i] = true;
            }
        }

        // Second pass: Check for cows (correct digit, wrong position)
        for (int i = 0; i < target.length; i++) {
            if (guessDigits[i] != target[i]) {
                for (int j = 0; j < target.length; j++) {
                    if (!used[j] && guessDigits[i] == target[j]) {
                        cows++;
                        used[j] = true;
                        break;
                    }
                }
            }
        }

        boolean isCorrect = bulls == target.length;

        // Update player state
        playerState.attempts++;
        playerState.lastActivity = LocalDateTime.now();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("bulls", bulls);
        response.put("cows", cows);
        response.put("isCorrect", isCorrect);
        response.put("attempts", playerState.attempts);

        // Get opponent ID
        Long opponentId = user.getId().equals(session.player1Id) ? session.player2Id : session.player1Id;
        ActiveGameSession.PlayerState opponentState = session.playerStates.get(opponentId);

        // Notify opponent of guess
        Map<String, Object> opponentNotification = new HashMap<>();
        opponentNotification.put("type", "opponent_guessed");
        opponentNotification.put("sessionId", sessionId);
        opponentNotification.put("opponentAttempts", playerState.attempts);
        messagingTemplate.convertAndSend("/queue/game." + opponentId, opponentNotification);

        // Check game completion scenarios
        if (isCorrect) {
            playerState.solved = true;
            playerState.solvedAt = LocalDateTime.now();

            // If opponent also solved, determine winner by fewest attempts
            if (opponentState.solved) {
                Long winnerId = playerState.attempts < opponentState.attempts ? user.getId() :
                               playerState.attempts > opponentState.attempts ? opponentId : null;

                if (winnerId == null) {
                    // Draw - both solved with same attempts (shouldn't happen since one solved first)
                    completeGameWithDraw(sessionId, session);
                    response.put("message", "It's a draw! Both solved with same attempts!");
                } else {
                    completeGame(sessionId, winnerId, session);
                    response.put("message", winnerId.equals(user.getId()) ?
                        "Congratulations! You won with fewer attempts!" :
                        "Opponent won with fewer attempts!");
                }
            } else {
                // Only this player solved - they win
                completeGame(sessionId, user.getId(), session);
                response.put("message", "Congratulations! You won!");
            }
        } else if (playerState.attempts >= session.maxAttempts) {
            // Player reached max attempts without solving
            // Check if opponent also reached max (or already solved)
            if (opponentState.solved) {
                // Opponent already won
                completeGame(sessionId, opponentId, session);
                response.put("message", "Out of attempts! Opponent wins!");
            } else if (opponentState.attempts >= session.maxAttempts) {
                // Both reached max without solving - draw
                completeGameWithDraw(sessionId, session);
                response.put("message", "Out of attempts! It's a draw!");
            }
            // else: wait for opponent to finish their attempts
        }

        return response;
    }

    /**
     * Get session status (attempts for both players)
     */
    public Map<String, Object> getSessionStatus(User user, String sessionId) {
        ActiveGameSession session = activeSessions.get(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("Game session not found");
        }

        // Verify user is in this game
        if (!user.getId().equals(session.player1Id) && !user.getId().equals(session.player2Id)) {
            throw new IllegalArgumentException("You are not a player in this game");
        }

        Long opponentId = user.getId().equals(session.player1Id) ? session.player2Id : session.player1Id;
        ActiveGameSession.PlayerState myState = session.playerStates.get(user.getId());
        ActiveGameSession.PlayerState opponentState = session.playerStates.get(opponentId);

        Map<String, Object> status = new HashMap<>();
        status.put("success", true);
        status.put("sessionId", sessionId);
        status.put("digitCount", session.digitCount);
        status.put("myAttempts", myState.attempts);
        status.put("opponentAttempts", opponentState.attempts);
        status.put("mySolved", myState.solved);
        status.put("opponentSolved", opponentState.solved);

        return status;
    }

    /**
     * Get multiplayer stats for a user
     */
    public Map<String, Object> getMultiplayerStats(User user) {
        Long totalGames = sessionRepository.countCompletedGamesByUserId(user.getId());
        Long wins = sessionRepository.countWinsByUserId(user.getId());

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalGames", totalGames);
        stats.put("wins", wins);
        stats.put("losses", totalGames - wins);
        stats.put("winRate", totalGames > 0 ? String.format("%.1f%%", (wins * 100.0 / totalGames)) : "0.0%");

        return stats;
    }

    /**
     * Complete a game session (called when someone wins)
     */
    @Transactional
    protected void completeGame(String sessionId, Long winnerId, ActiveGameSession session) {
        // Update database session
        MultiplayerGameSession dbSession = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Database session not found"));

        dbSession.setStatus(MultiplayerGameSession.Status.COMPLETED);
        dbSession.setWinner(userRepository.findById(winnerId).orElse(null));
        dbSession.setCompletedAt(LocalDateTime.now());
        sessionRepository.save(dbSession);

        // Update player progress in database
        for (Map.Entry<Long, ActiveGameSession.PlayerState> entry : session.playerStates.entrySet()) {
            Long userId = entry.getKey();
            ActiveGameSession.PlayerState state = entry.getValue();

            MultiplayerPlayerProgress progress = progressRepository
                    .findBySessionIdAndUserId(dbSession.getId(), userId)
                    .orElseThrow(() -> new IllegalArgumentException("Progress not found"));

            progress.setAttemptsCount(state.attempts);
            progress.setSolved(state.solved);
            progress.setSolvedAt(state.solvedAt);
            progress.setLastActivity(state.lastActivity);
            progressRepository.save(progress);
        }

        // Award coins to winner
        int coinsAwarded = userService.awardCoins(winnerId, session.difficulty);

        // Update user stats (totalGames, totalWins)
        User winner = userRepository.findById(winnerId).orElse(null);
        Long loserId = winnerId.equals(session.player1Id) ? session.player2Id : session.player1Id;
        User loser = userRepository.findById(loserId).orElse(null);

        if (winner != null) {
            winner.setTotalGames((winner.getTotalGames() != null ? winner.getTotalGames() : 0) + 1);
            winner.setTotalWins((winner.getTotalWins() != null ? winner.getTotalWins() : 0) + 1);
            userRepository.save(winner);
        }

        if (loser != null) {
            loser.setTotalGames((loser.getTotalGames() != null ? loser.getTotalGames() : 0) + 1);
            userRepository.save(loser);
        }

        // Send WebSocket notifications
        Map<String, Object> winnerNotification = new HashMap<>();
        winnerNotification.put("type", "game_completed");
        winnerNotification.put("result", "won");
        winnerNotification.put("coinsAwarded", coinsAwarded);
        messagingTemplate.convertAndSend("/queue/game." + winnerId, winnerNotification);

        Map<String, Object> loserNotification = new HashMap<>();
        loserNotification.put("type", "game_completed");
        loserNotification.put("result", "lost");
        loserNotification.put("secretNumber", session.secretNumber);
        messagingTemplate.convertAndSend("/queue/game." + loserId, loserNotification);

        // Remove from active sessions
        activeSessions.remove(sessionId);

        logger.info("Game completed: Winner {} in session {}", winnerId, sessionId);
    }

    /**
     * Complete a game session with a draw (no winner)
     */
    @Transactional
    protected void completeGameWithDraw(String sessionId, ActiveGameSession session) {
        // Update database session
        MultiplayerGameSession dbSession = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Database session not found"));

        dbSession.setStatus(MultiplayerGameSession.Status.COMPLETED);
        dbSession.setWinner(null); // No winner in a draw
        dbSession.setCompletedAt(LocalDateTime.now());
        sessionRepository.save(dbSession);

        // Update player progress in database
        for (Map.Entry<Long, ActiveGameSession.PlayerState> entry : session.playerStates.entrySet()) {
            Long userId = entry.getKey();
            ActiveGameSession.PlayerState state = entry.getValue();

            MultiplayerPlayerProgress progress = progressRepository
                    .findBySessionIdAndUserId(dbSession.getId(), userId)
                    .orElseThrow(() -> new IllegalArgumentException("Progress not found"));

            progress.setAttemptsCount(state.attempts);
            progress.setSolved(state.solved);
            progress.setSolvedAt(state.solvedAt);
            progress.setLastActivity(state.lastActivity);
            progressRepository.save(progress);
        }

        // Update user stats (totalGames for both, no wins)
        User player1 = userRepository.findById(session.player1Id).orElse(null);
        User player2 = userRepository.findById(session.player2Id).orElse(null);

        if (player1 != null) {
            player1.setTotalGames((player1.getTotalGames() != null ? player1.getTotalGames() : 0) + 1);
            userRepository.save(player1);
        }

        if (player2 != null) {
            player2.setTotalGames((player2.getTotalGames() != null ? player2.getTotalGames() : 0) + 1);
            userRepository.save(player2);
        }

        // Send WebSocket notifications to both players
        Map<String, Object> drawNotification1 = new HashMap<>();
        drawNotification1.put("type", "game_completed");
        drawNotification1.put("result", "draw");
        drawNotification1.put("secretNumber", session.secretNumber);
        messagingTemplate.convertAndSend("/queue/game." + session.player1Id, drawNotification1);

        Map<String, Object> drawNotification2 = new HashMap<>();
        drawNotification2.put("type", "game_completed");
        drawNotification2.put("result", "draw");
        drawNotification2.put("secretNumber", session.secretNumber);
        messagingTemplate.convertAndSend("/queue/game." + session.player2Id, drawNotification2);

        // Remove from active sessions
        activeSessions.remove(sessionId);

        logger.info("Game completed with draw in session {}", sessionId);
    }

    /**
     * Decline a challenge
     */
    @Transactional
    public Map<String, Object> declineChallenge(User user, Long challengeId) {
        MultiplayerChallenge challenge = challengeRepository.findByIdAndChallengedId(challengeId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Challenge not found"));

        if (challenge.getStatus() != MultiplayerChallenge.Status.PENDING) {
            throw new IllegalArgumentException("This challenge has already been processed");
        }

        challenge.setStatus(MultiplayerChallenge.Status.DECLINED);
        challengeRepository.save(challenge);

        logger.info("Challenge declined: {} declined challenge from {}",
                    user.getUsername(), challenge.getChallenger().getUsername());

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Challenge declined");
        return result;
    }

    /**
     * Cancel a challenge (only challenger can cancel)
     */
    @Transactional
    public Map<String, Object> cancelChallenge(User user, Long challengeId) {
        MultiplayerChallenge challenge = challengeRepository.findByIdAndChallengerId(challengeId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Challenge not found"));

        if (challenge.getStatus() != MultiplayerChallenge.Status.PENDING) {
            throw new IllegalArgumentException("This challenge has already been processed");
        }

        challenge.setStatus(MultiplayerChallenge.Status.CANCELLED);
        challengeRepository.save(challenge);

        logger.info("Challenge cancelled: {} cancelled challenge to {}",
                    user.getUsername(), challenge.getChallenged().getUsername());

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Challenge cancelled");
        return result;
    }

    /**
     * Get pending challenges for a user (received)
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPendingChallenges(User user) {
        List<MultiplayerChallenge> challenges = challengeRepository.findByChallengedIdAndStatus(
                user.getId(), MultiplayerChallenge.Status.PENDING);

        // Filter out expired challenges
        LocalDateTime now = LocalDateTime.now();
        return challenges.stream()
                .filter(c -> !c.isExpired())
                .map(challenge -> {
                    Map<String, Object> challengeInfo = new HashMap<>();
                    challengeInfo.put("id", challenge.getId());
                    challengeInfo.put("challengerId", challenge.getChallenger().getId());
                    challengeInfo.put("challengerUsername", challenge.getChallenger().getUsername());
                    challengeInfo.put("difficulty", challenge.getDifficulty());
                    challengeInfo.put("createdAt", challenge.getCreatedAt());
                    challengeInfo.put("expiresAt", challenge.getExpiresAt());
                    return challengeInfo;
                })
                .collect(Collectors.toList());
    }

    /**
     * Get sent challenges (outgoing)
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSentChallenges(User user) {
        List<MultiplayerChallenge> challenges = challengeRepository.findByChallengerIdAndStatus(
                user.getId(), MultiplayerChallenge.Status.PENDING);

        LocalDateTime now = LocalDateTime.now();
        return challenges.stream()
                .filter(c -> !c.isExpired())
                .map(challenge -> {
                    Map<String, Object> challengeInfo = new HashMap<>();
                    challengeInfo.put("id", challenge.getId());
                    challengeInfo.put("challengedId", challenge.getChallenged().getId());
                    challengeInfo.put("challengedUsername", challenge.getChallenged().getUsername());
                    challengeInfo.put("difficulty", challenge.getDifficulty());
                    challengeInfo.put("createdAt", challenge.getCreatedAt());
                    challengeInfo.put("expiresAt", challenge.getExpiresAt());
                    return challengeInfo;
                })
                .collect(Collectors.toList());
    }

    /**
     * Scheduled task to expire old challenges
     * Runs every 5 minutes
     */
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void expireChallenges() {
        LocalDateTime now = LocalDateTime.now();
        List<MultiplayerChallenge> expiredChallenges = challengeRepository.findExpiredChallenges(now);

        if (!expiredChallenges.isEmpty()) {
            for (MultiplayerChallenge challenge : expiredChallenges) {
                challenge.setStatus(MultiplayerChallenge.Status.EXPIRED);
            }
            challengeRepository.saveAll(expiredChallenges);
            logger.info("Expired {} challenges", expiredChallenges.size());
        }
    }

    /**
     * Scheduled task to clean up abandoned game sessions
     * Runs every 10 minutes
     */
    @Scheduled(fixedRate = 600000)
    @Transactional
    public void cleanupAbandonedSessions() {
        // Remove sessions older than 30 minutes that are still IN_PROGRESS
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(30);
        List<MultiplayerGameSession> abandonedSessions = sessionRepository.findAbandonedSessions(cutoffTime);

        if (!abandonedSessions.isEmpty()) {
            for (MultiplayerGameSession session : abandonedSessions) {
                session.setStatus(MultiplayerGameSession.Status.ABANDONED);
                activeSessions.remove(session.getSessionId());
            }
            sessionRepository.saveAll(abandonedSessions);
            logger.info("Cleaned up {} abandoned sessions", abandonedSessions.size());
        }
    }

    /**
     * Helper: Get digit count based on difficulty
     */
    private Integer getDigitCountForDifficulty(Integer difficulty) {
        return switch (difficulty) {
            case 0 -> 3;  // Easy
            case 1 -> 4;  // Medium
            case 2 -> 5;  // Hard
            default -> 4;
        };
    }

    /**
     * Helper: Convert number to digit array
     */
    private int[] getDigits(int number) {
        String numberString = String.valueOf(number);
        int[] digits = new int[numberString.length()];
        for (int i = 0; i < numberString.length(); i++) {
            digits[i] = Character.getNumericValue(numberString.charAt(i));
        }
        return digits;
    }
}
