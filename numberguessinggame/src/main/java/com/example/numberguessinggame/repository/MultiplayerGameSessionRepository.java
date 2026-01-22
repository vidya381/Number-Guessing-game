package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.MultiplayerGameSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MultiplayerGameSessionRepository extends JpaRepository<MultiplayerGameSession, Long> {

    /**
     * Find session by session ID (UUID string)
     */
    Optional<MultiplayerGameSession> findBySessionId(String sessionId);

    /**
     * Find active (IN_PROGRESS) sessions for a user
     */
    @Query("SELECT mgs FROM MultiplayerGameSession mgs WHERE " +
           "(mgs.player1.id = :userId OR mgs.player2.id = :userId) " +
           "AND mgs.status = 'IN_PROGRESS'")
    List<MultiplayerGameSession> findActiveSessionsByUserId(@Param("userId") Long userId);

    /**
     * Find completed sessions for a user
     */
    @Query("SELECT mgs FROM MultiplayerGameSession mgs WHERE " +
           "(mgs.player1.id = :userId OR mgs.player2.id = :userId) " +
           "AND mgs.status = 'COMPLETED' " +
           "ORDER BY mgs.completedAt DESC")
    List<MultiplayerGameSession> findCompletedSessionsByUserId(@Param("userId") Long userId);

    /**
     * Count wins for a user
     */
    @Query("SELECT COUNT(mgs) FROM MultiplayerGameSession mgs WHERE " +
           "mgs.winner.id = :userId AND mgs.status = 'COMPLETED'")
    Long countWinsByUserId(@Param("userId") Long userId);

    /**
     * Count total completed games for a user
     */
    @Query("SELECT COUNT(mgs) FROM MultiplayerGameSession mgs WHERE " +
           "(mgs.player1.id = :userId OR mgs.player2.id = :userId) " +
           "AND mgs.status = 'COMPLETED'")
    Long countCompletedGamesByUserId(@Param("userId") Long userId);

    /**
     * Find abandoned sessions (older than specified time and still IN_PROGRESS)
     */
    @Query("SELECT mgs FROM MultiplayerGameSession mgs WHERE " +
           "mgs.status = 'IN_PROGRESS' AND mgs.startedAt < :cutoffTime")
    List<MultiplayerGameSession> findAbandonedSessions(@Param("cutoffTime") LocalDateTime cutoffTime);
}
