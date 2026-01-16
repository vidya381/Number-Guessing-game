package com.example.numberguessinggame.service;

import com.example.numberguessinggame.entity.TimeAttackSession;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.TimeAttackSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TimeAttackService {

    private static final Logger logger = LoggerFactory.getLogger(TimeAttackService.class);

    @Autowired
    private TimeAttackSessionRepository repository;

    /**
     * Calculate points for a single game win
     *
     * Simple scoring: Just base points by difficulty
     * - Easy: 3 points
     * - Medium: 6 points
     * - Hard: 9 points
     *
     * @param difficulty Game difficulty (0=Easy, 1=Medium, 2=Hard)
     * @param attempts Number of attempts taken to win (not used in scoring)
     * @param timeSeconds Time taken to win in seconds (not used in scoring)
     * @return Points earned
     */
    public int calculateGamePoints(int difficulty, int attempts, int timeSeconds) {
        // Simple points by difficulty - no bonuses
        int points = switch(difficulty) {
            case 0 -> 3;    // Easy
            case 1 -> 6;    // Medium
            case 2 -> 9;    // Hard
            default -> 3;
        };

        logger.debug("Points calculation - Difficulty: {}, Attempts: {}, Time: {}s = {} points",
                difficulty, attempts, timeSeconds, points);

        return points;
    }

    /**
     * Save a completed Time Attack session (authenticated users only)
     *
     * @param user The user who played
     * @param difficulty Selected difficulty
     * @param totalScore Total score accumulated
     * @param gamesWon Number of games won
     * @param gamesPlayed Total games attempted
     * @param averageAttempts Average attempts per win
     * @param fastestWinSeconds Fastest individual game win time
     * @param gameDetails JSON string with individual game results
     * @return Saved TimeAttackSession
     */
    @Transactional
    public TimeAttackSession saveSession(User user, Integer difficulty, Integer totalScore,
                                         Integer gamesWon, Integer gamesPlayed,
                                         Double averageAttempts, Integer fastestWinSeconds,
                                         String gameDetails) {
        TimeAttackSession session = new TimeAttackSession(
            user,
            difficulty,
            totalScore,
            gamesWon,
            gamesPlayed,
            averageAttempts,
            fastestWinSeconds,
            gameDetails
        );

        TimeAttackSession saved = repository.save(session);

        logger.info("Time Attack session saved - User: {}, Difficulty: {}, Score: {}, Wins: {}/{} games",
                user.getUsername(), difficulty, totalScore, gamesWon, gamesPlayed);

        // Update best run flags for this user-difficulty combination
        updateBestRunFlags(user, difficulty);

        return saved;
    }

    /**
     * Update best run flags for a user-difficulty combination
     * Ensures only the user's best session for this difficulty has isBestRun = true
     */
    @Transactional
    public void updateBestRunFlags(User user, Integer difficulty) {
        // Get user's actual best session for this difficulty
        List<TimeAttackSession> bestSessions = repository.findUserSessionsByDifficulty(
            user, difficulty, PageRequest.of(0, 1)
        );

        if (bestSessions.isEmpty()) {
            return; // No sessions for this user-difficulty
        }

        TimeAttackSession actualBest = bestSessions.get(0);

        // Get all sessions currently marked as best run
        List<TimeAttackSession> currentBestRuns = repository.findBestRunsByUserAndDifficulty(
            user, difficulty
        );

        // If the actual best is already marked as best run and no others are, we're done
        if (currentBestRuns.size() == 1 && currentBestRuns.get(0).getId().equals(actualBest.getId())) {
            return;
        }

        // Clear all best run flags for this user-difficulty
        for (TimeAttackSession session : currentBestRuns) {
            session.setIsBestRun(false);
            repository.save(session);
        }

        // Set the actual best as best run
        actualBest.setIsBestRun(true);
        repository.save(actualBest);

        logger.info("Updated best run flag for user {} difficulty {} - session {} is now best",
                user.getId(), difficulty, actualBest.getId());
    }

    /**
     * Get leaderboard for a specific difficulty
     *
     * @param difficulty Difficulty level (0=Easy, 1=Medium, 2=Hard)
     * @param limit Maximum number of entries to return
     * @return List of top sessions ordered by score
     */
    public List<TimeAttackSession> getLeaderboard(int difficulty, int limit) {
        return repository.findLeaderboardByDifficulty(difficulty, PageRequest.of(0, limit));
    }

    /**
     * Get user's rank on leaderboard for a specific session
     *
     * @param sessionId The session ID to find rank for
     * @param difficulty Difficulty level
     * @return Rank (1-based) or null if outside top 1000 or not found
     */
    public Integer getUserRank(Long sessionId, int difficulty) {
        try {
            List<TimeAttackSession> leaderboard = getLeaderboard(difficulty, 1000);

            for (int i = 0; i < leaderboard.size(); i++) {
                if (leaderboard.get(i).getId().equals(sessionId)) {
                    return i + 1;  // 1-based rank
                }
            }

            // Session not in top 1000 - check if it exists at all
            boolean sessionExists = repository.existsById(sessionId);
            if (!sessionExists) {
                logger.warn("Session {} not found in database for difficulty {}", sessionId, difficulty);
            } else {
                logger.info("Session {} ranked outside top 1000 for difficulty {}", sessionId, difficulty);
            }

            return null;  // Outside top 1000 or not found
        } catch (Exception e) {
            logger.error("Failed to get rank for session {} difficulty {}: {}", sessionId, difficulty, e.getMessage());
            return null;
        }
    }

    /**
     * Get user's statistics across all Time Attack sessions
     *
     * @param user The user
     * @return Map with aggregated statistics
     */
    public Map<String, Object> getUserStats(User user) {
        Map<String, Object> stats = new HashMap<>();

        // Total sessions played
        long totalSessions = repository.countByUser(user);
        stats.put("totalSessions", totalSessions);

        // Total wins across all sessions
        Long totalWins = repository.countTotalWinsByUser(user).orElse(0L);
        stats.put("totalWins", totalWins);

        // Total score across all sessions
        Long totalScore = repository.sumTotalScoreByUser(user).orElse(0L);
        stats.put("totalScore", totalScore);

        // Best overall score
        Integer bestScore = repository.findMaxScoreByUser(user).orElse(0);
        stats.put("bestScore", bestScore);

        // Total games played across all sessions
        Long totalGamesPlayed = repository.countTotalGamesPlayedByUser(user).orElse(0L);
        stats.put("totalGamesPlayed", totalGamesPlayed);

        // Best sessions per difficulty
        TimeAttackSession bestEasy = repository.findUserBestByDifficulty(
            user, 0, PageRequest.of(0, 1)
        ).stream().findFirst().orElse(null);
        stats.put("bestEasyScore", bestEasy != null ? bestEasy.getTotalScore() : 0);

        TimeAttackSession bestMedium = repository.findUserBestByDifficulty(
            user, 1, PageRequest.of(0, 1)
        ).stream().findFirst().orElse(null);
        stats.put("bestMediumScore", bestMedium != null ? bestMedium.getTotalScore() : 0);

        TimeAttackSession bestHard = repository.findUserBestByDifficulty(
            user, 2, PageRequest.of(0, 1)
        ).stream().findFirst().orElse(null);
        stats.put("bestHardScore", bestHard != null ? bestHard.getTotalScore() : 0);

        // Recent sessions (last 10)
        List<TimeAttackSession> recentSessions = repository.findTop10ByUserOrderByPlayedAtDesc(user);
        stats.put("recentSessions", recentSessions);

        return stats;
    }

    /**
     * Get difficulty text
     */
    public String getDifficultyText(int difficulty) {
        return switch (difficulty) {
            case 0 -> "Easy (3 digits)";
            case 1 -> "Medium (4 digits)";
            case 2 -> "Hard (5 digits)";
            default -> "Unknown";
        };
    }
}
