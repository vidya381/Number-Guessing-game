package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.DailyChallenge;
import com.example.numberguessinggame.entity.DailyChallengeAttempt;
import com.example.numberguessinggame.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DailyChallengeAttemptRepository extends JpaRepository<DailyChallengeAttempt, Long> {

    /**
     * Check if user already attempted this challenge
     */
    boolean existsByUserAndChallenge(User user, DailyChallenge challenge);

    /**
     * Find user's attempt for specific challenge
     */
    Optional<DailyChallengeAttempt> findByUserAndChallenge(User user, DailyChallenge challenge);

    /**
     * Get leaderboard for a challenge
     * Ranked by: won first, then fewest attempts, then fastest time
     */
    @Query("SELECT a FROM DailyChallengeAttempt a " +
           "JOIN FETCH a.user " +
           "WHERE a.challenge = :challenge AND a.won = true " +
           "ORDER BY a.attempts ASC, a.timeTakenSeconds ASC")
    List<DailyChallengeAttempt> findTopAttemptsByChallenge(
        @Param("challenge") DailyChallenge challenge,
        Pageable pageable
    );

    /**
     * Get user's history across all daily challenges
     */
    @Query("SELECT a FROM DailyChallengeAttempt a " +
           "WHERE a.user = :user " +
           "ORDER BY a.completedAt DESC")
    List<DailyChallengeAttempt> findByUserOrderByCompletedAtDesc(
        @Param("user") User user,
        Pageable pageable
    );

    /**
     * Count user's total daily challenge wins
     */
    long countByUserAndWon(User user, Boolean won);

    /**
     * Get user's best daily challenge performance (fewest attempts on a win)
     */
    @Query("SELECT MIN(a.attempts) FROM DailyChallengeAttempt a " +
           "WHERE a.user = :user AND a.won = true")
    Optional<Integer> findBestAttemptsByUser(@Param("user") User user);
}
