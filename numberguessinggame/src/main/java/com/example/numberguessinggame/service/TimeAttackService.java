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
     * Scoring formula:
     * - Base points by difficulty: Easy=100, Medium=200, Hard=300
     * - Speed bonus: (11 - attempts) * 10 (max 100 points for 1 attempt)
     * - Time bonus: <30s=+50, 30-60s=+30, 60-90s=+10, >90s=0
     *
     * @param difficulty Game difficulty (0=Easy, 1=Medium, 2=Hard)
     * @param attempts Number of attempts taken to win
     * @param timeSeconds Time taken to win in seconds
     * @return Total points earned
     */
    public int calculateGamePoints(int difficulty, int attempts, int timeSeconds) {
        // Base points by difficulty
        int basePoints = switch(difficulty) {
            case 0 -> 100;  // Easy
            case 1 -> 200;  // Medium
            case 2 -> 300;  // Hard
            default -> 100;
        };

        // Speed bonus: fewer attempts = more bonus (max 100 for 1 attempt, min 10 for 10 attempts)
        int speedBonus = Math.max(0, (11 - attempts) * 10);

        // Time bonus: reward fast completion
        int timeBonus;
        if (timeSeconds < 30) {
            timeBonus = 50;
        } else if (timeSeconds < 60) {
            timeBonus = 30;
        } else if (timeSeconds < 90) {
            timeBonus = 10;
        } else {
            timeBonus = 0;
        }

        int totalPoints = basePoints + speedBonus + timeBonus;

        logger.debug("Points calculation - Difficulty: {}, Attempts: {}, Time: {}s = {} points (base: {}, speed: {}, time: {})",
                difficulty, attempts, timeSeconds, totalPoints, basePoints, speedBonus, timeBonus);

        return totalPoints;
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

        return saved;
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
     * @return Rank (1-based) or null if not found
     */
    public Integer getUserRank(Long sessionId, int difficulty) {
        List<TimeAttackSession> leaderboard = getLeaderboard(difficulty, 1000);

        for (int i = 0; i < leaderboard.size(); i++) {
            if (leaderboard.get(i).getId().equals(sessionId)) {
                return i + 1;  // 1-based rank
            }
        }

        return null;
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
