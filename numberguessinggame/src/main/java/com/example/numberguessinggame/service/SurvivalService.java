package com.example.numberguessinggame.service;

import com.example.numberguessinggame.entity.SurvivalSession;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.SurvivalSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SurvivalService {

    private static final Logger logger = LoggerFactory.getLogger(SurvivalService.class);

    @Autowired
    private SurvivalSessionRepository survivalSessionRepository;

    /**
     * Save a completed survival session
     */
    @Transactional
    public SurvivalSession saveSurvivalSession(User user, Integer difficulty,
                                               Integer roundsSurvived, Integer totalAttemptsUsed,
                                               Boolean completed, Integer coinsEarned,
                                               LocalDateTime startedAt) {
        SurvivalSession session = new SurvivalSession(
            user, difficulty, roundsSurvived, totalAttemptsUsed,
            completed, coinsEarned, startedAt
        );

        SurvivalSession saved = survivalSessionRepository.save(session);

        logger.info("Survival session saved - UserID: {}, Difficulty: {}, Rounds: {}/5, Completed: {}, Coins: {}",
                user.getId(), difficulty, roundsSurvived, completed, coinsEarned);

        return saved;
    }

    /**
     * Get user's survival statistics
     */
    public Map<String, Object> getUserSurvivalStats(User user) {
        Map<String, Object> stats = new HashMap<>();

        // Best run
        List<SurvivalSession> bestRuns = survivalSessionRepository.findUserBestRun(
            user, PageRequest.of(0, 1)
        );

        if (!bestRuns.isEmpty()) {
            SurvivalSession bestRun = bestRuns.get(0);
            stats.put("bestRun", bestRun.getRoundsSurvived());
            stats.put("bestRunAttempts", bestRun.getTotalAttemptsUsed());
            stats.put("bestRunDifficulty", bestRun.getDifficulty());
            stats.put("bestRunCompleted", bestRun.getCompleted());
        } else {
            stats.put("bestRun", 0);
            stats.put("bestRunAttempts", 0);
            stats.put("bestRunDifficulty", 0);
            stats.put("bestRunCompleted", false);
        }

        // Total completions (5/5 rounds)
        Long completions = survivalSessionRepository.countCompletionsByUser(user);
        stats.put("totalCompletions", completions);

        // Total attempts
        Long totalAttempts = survivalSessionRepository.countByUser(user);
        stats.put("totalAttempts", totalAttempts);

        return stats;
    }

    /**
     * Get leaderboard for a specific difficulty
     */
    public List<SurvivalSession> getLeaderboard(Integer difficulty, Integer limit) {
        return survivalSessionRepository.findLeaderboardByDifficulty(
            difficulty, PageRequest.of(0, limit)
        );
    }

    /**
     * Get user's rank on leaderboard for a specific session
     * @param sessionId The session ID to find rank for
     * @param difficulty Difficulty level
     * @return Rank (1-based) or null if outside top 1000 or not found
     */
    public Integer getUserRank(Long sessionId, Integer difficulty) {
        try {
            List<SurvivalSession> leaderboard = survivalSessionRepository
                .findLeaderboardByDifficulty(difficulty, PageRequest.of(0, 1000));

            for (int i = 0; i < leaderboard.size(); i++) {
                if (leaderboard.get(i).getId().equals(sessionId)) {
                    return i + 1;
                }
            }

            // Session not in top 1000 - check if it exists at all
            boolean sessionExists = survivalSessionRepository.existsById(sessionId);
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
     * Get difficulty text
     */
    public String getDifficultyText(Integer difficulty) {
        return switch(difficulty) {
            case 0 -> "Easy";
            case 1 -> "Medium";
            case 2 -> "Hard";
            default -> "Unknown";
        };
    }

    /**
     * Get max attempts for a difficulty level
     */
    public Integer getMaxAttemptsForDifficulty(Integer difficulty) {
        return switch(difficulty) {
            case 0 -> 7;   // Easy: 3 digits, 7 attempts
            case 1 -> 10;  // Medium: 4 digits, 10 attempts
            case 2 -> 13;  // Hard: 5 digits, 13 attempts
            default -> 7;
        };
    }

    /**
     * Get coins per round for a difficulty level
     */
    public Integer getCoinsPerRound(Integer difficulty) {
        return switch(difficulty) {
            case 0 -> 3;   // Easy
            case 1 -> 6;   // Medium
            case 2 -> 9;   // Hard
            default -> 3;
        };
    }

    /**
     * Get completion bonus for a difficulty level
     */
    public Integer getCompletionBonus(Integer difficulty) {
        return switch(difficulty) {
            case 0 -> 5;   // Easy
            case 1 -> 10;  // Medium
            case 2 -> 15;  // Hard
            default -> 5;
        };
    }
}
