package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.SurvivalSession;
import com.example.numberguessinggame.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SurvivalSessionRepository extends JpaRepository<SurvivalSession, Long> {

    /**
     * Get leaderboard for a specific difficulty
     * Shows only the BEST run per player (using cached is_best_run flag)
     * Ranked by: completed DESC, roundsSurvived DESC, totalAttemptsUsed ASC
     * Only includes authenticated users (user IS NOT NULL)
     */
    @Query("SELECT s FROM SurvivalSession s " +
           "JOIN FETCH s.user u " +
           "WHERE s.difficulty = :difficulty AND s.isBestRun = true " +
           "ORDER BY s.completed DESC, s.roundsSurvived DESC, s.totalAttemptsUsed ASC")
    List<SurvivalSession> findLeaderboardByDifficulty(
        @Param("difficulty") Integer difficulty,
        Pageable pageable
    );

    /**
     * Get user's best survival run (most rounds survived, then fewest attempts)
     */
    @Query("SELECT s FROM SurvivalSession s " +
           "WHERE s.user = :user " +
           "ORDER BY s.roundsSurvived DESC, s.totalAttemptsUsed ASC")
    List<SurvivalSession> findUserBestRun(
        @Param("user") User user,
        Pageable pageable
    );

    /**
     * Count user's total completions (5/5 rounds)
     */
    @Query("SELECT COUNT(s) FROM SurvivalSession s " +
           "WHERE s.user = :user AND s.completed = true")
    Long countCompletionsByUser(@Param("user") User user);

    /**
     * Count total sessions played by user
     */
    long countByUser(User user);

    /**
     * Find all sessions for a user-difficulty combination marked as best run
     * Used to clear old best run flags when a new best is achieved
     */
    @Query("SELECT s FROM SurvivalSession s " +
           "WHERE s.user = :user AND s.difficulty = :difficulty AND s.isBestRun = true")
    List<SurvivalSession> findBestRunsByUserAndDifficulty(
        @Param("user") User user,
        @Param("difficulty") Integer difficulty
    );

    /**
     * Find user's actual best session for comparison
     * Ordered by completed DESC, rounds DESC, attempts ASC to match leaderboard logic
     */
    @Query("SELECT s FROM SurvivalSession s " +
           "WHERE s.user = :user AND s.difficulty = :difficulty " +
           "ORDER BY s.completed DESC, s.roundsSurvived DESC, s.totalAttemptsUsed ASC, s.id ASC")
    List<SurvivalSession> findUserSessionsByDifficulty(
        @Param("user") User user,
        @Param("difficulty") Integer difficulty,
        Pageable pageable
    );
}
