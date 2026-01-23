package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.MultiplayerChallenge;
import com.example.numberguessinggame.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MultiplayerChallengeRepository extends JpaRepository<MultiplayerChallenge, Long> {

    /**
     * Find challenges received by a user with specific status
     */
    @Query("SELECT mc FROM MultiplayerChallenge mc WHERE mc.challenged.id = :userId AND mc.status = :status")
    List<MultiplayerChallenge> findByChallengedIdAndStatus(@Param("userId") Long userId,
                                                             @Param("status") MultiplayerChallenge.Status status);

    /**
     * Find challenges sent by a user with specific status
     */
    @Query("SELECT mc FROM MultiplayerChallenge mc WHERE mc.challenger.id = :userId AND mc.status = :status")
    List<MultiplayerChallenge> findByChallengerIdAndStatus(@Param("userId") Long userId,
                                                            @Param("status") MultiplayerChallenge.Status status);

    /**
     * Find all active (pending, non-expired) challenges
     */
    @Query("SELECT mc FROM MultiplayerChallenge mc WHERE mc.status = 'PENDING' AND mc.expiresAt > :now")
    List<MultiplayerChallenge> findActiveChallenges(@Param("now") LocalDateTime now);

    /**
     * Find expired challenges that are still marked as PENDING
     */
    @Query("SELECT mc FROM MultiplayerChallenge mc WHERE mc.status = 'PENDING' AND mc.expiresAt <= :now")
    List<MultiplayerChallenge> findExpiredChallenges(@Param("now") LocalDateTime now);

    /**
     * Find pending challenge between two users (either direction)
     */
    @Query("SELECT mc FROM MultiplayerChallenge mc WHERE " +
           "((mc.challenger.id = :userId1 AND mc.challenged.id = :userId2) OR " +
           "(mc.challenger.id = :userId2 AND mc.challenged.id = :userId1)) " +
           "AND mc.status = 'PENDING' AND mc.expiresAt > :now")
    Optional<MultiplayerChallenge> findPendingChallengeBetweenUsers(@Param("userId1") Long userId1,
                                                                     @Param("userId2") Long userId2,
                                                                     @Param("now") LocalDateTime now);

    /**
     * Find challenge by ID and verify user is the challenged party
     */
    @Query("SELECT mc FROM MultiplayerChallenge mc WHERE mc.id = :challengeId AND mc.challenged.id = :userId")
    Optional<MultiplayerChallenge> findByIdAndChallengedId(@Param("challengeId") Long challengeId,
                                                            @Param("userId") Long userId);

    /**
     * Find challenge by ID and verify user is the challenger
     */
    @Query("SELECT mc FROM MultiplayerChallenge mc WHERE mc.id = :challengeId AND mc.challenger.id = :userId")
    Optional<MultiplayerChallenge> findByIdAndChallengerId(@Param("challengeId") Long challengeId,
                                                            @Param("userId") Long userId);
}
