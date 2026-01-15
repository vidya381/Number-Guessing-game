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
     * Sorted by: completed DESC, rounds_survived DESC, total_attempts_used ASC
     */
    @Query("SELECT s FROM SurvivalSession s " +
           "JOIN FETCH s.user u " +
           "WHERE s.difficulty = :difficulty " +
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
     * Get all sessions for a user (for profile stats)
     */
    List<SurvivalSession> findByUserOrderByCompletedAtDesc(User user);

    /**
     * Get user's recent sessions
     */
    List<SurvivalSession> findTop10ByUserOrderByCompletedAtDesc(User user);

    /**
     * Get user's best completed session for a specific difficulty
     */
    @Query("SELECT s FROM SurvivalSession s " +
           "WHERE s.user = :user AND s.difficulty = :difficulty AND s.completed = true " +
           "ORDER BY s.totalAttemptsUsed ASC")
    List<SurvivalSession> findUserBestCompletedByDifficulty(
        @Param("user") User user,
        @Param("difficulty") Integer difficulty,
        Pageable pageable
    );
}
