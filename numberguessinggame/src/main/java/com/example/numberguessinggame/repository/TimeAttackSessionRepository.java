package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.TimeAttackSession;
import com.example.numberguessinggame.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TimeAttackSessionRepository extends JpaRepository<TimeAttackSession, Long> {

    /**
     * Get leaderboard for a specific difficulty level
     * Shows only the BEST session per player
     * Ranked by: totalScore DESC, gamesWon DESC, averageAttempts ASC
     * Only includes authenticated users (user IS NOT NULL)
     */
    @Query("SELECT t FROM TimeAttackSession t " +
           "JOIN FETCH t.user u " +
           "WHERE t.difficulty = :difficulty AND t.user IS NOT NULL " +
           "AND t.totalScore = (" +
           "  SELECT MAX(t2.totalScore) FROM TimeAttackSession t2 " +
           "  WHERE t2.user = t.user AND t2.difficulty = :difficulty" +
           ") " +
           "AND t.id = (" +
           "  SELECT MIN(t3.id) FROM TimeAttackSession t3 " +
           "  WHERE t3.user = t.user AND t3.difficulty = :difficulty " +
           "  AND t3.totalScore = t.totalScore" +
           ") " +
           "ORDER BY t.totalScore DESC, t.gamesWon DESC, t.averageAttempts ASC")
    List<TimeAttackSession> findLeaderboardByDifficulty(
        @Param("difficulty") Integer difficulty,
        Pageable pageable
    );

    /**
     * Get user's best session for a specific difficulty
     */
    @Query("SELECT t FROM TimeAttackSession t " +
           "WHERE t.user = :user AND t.difficulty = :difficulty " +
           "ORDER BY t.totalScore DESC")
    List<TimeAttackSession> findUserBestByDifficulty(
        @Param("user") User user,
        @Param("difficulty") Integer difficulty,
        Pageable pageable
    );

    /**
     * Count total wins across all sessions for a user
     */
    @Query("SELECT SUM(t.gamesWon) FROM TimeAttackSession t WHERE t.user = :user")
    Optional<Long> countTotalWinsByUser(@Param("user") User user);

    /**
     * Sum total score across all sessions for a user
     */
    @Query("SELECT SUM(t.totalScore) FROM TimeAttackSession t WHERE t.user = :user")
    Optional<Long> sumTotalScoreByUser(@Param("user") User user);

    /**
     * Count total sessions played by user
     */
    long countByUser(User user);

    /**
     * Get user's recent sessions (most recent first)
     */
    List<TimeAttackSession> findTop10ByUserOrderByPlayedAtDesc(User user);

    /**
     * Get all sessions by user
     */
    List<TimeAttackSession> findByUserOrderByPlayedAtDesc(User user);

    /**
     * Get user's best overall score (across all difficulties)
     */
    @Query("SELECT MAX(t.totalScore) FROM TimeAttackSession t WHERE t.user = :user")
    Optional<Integer> findMaxScoreByUser(@Param("user") User user);

    /**
     * Get user's total games played across all sessions
     */
    @Query("SELECT SUM(t.gamesPlayed) FROM TimeAttackSession t WHERE t.user = :user")
    Optional<Long> countTotalGamesPlayedByUser(@Param("user") User user);
}
