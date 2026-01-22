package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.MultiplayerGameSession;
import com.example.numberguessinggame.entity.MultiplayerPlayerProgress;
import com.example.numberguessinggame.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MultiplayerPlayerProgressRepository extends JpaRepository<MultiplayerPlayerProgress, Long> {

    /**
     * Find player progress by session and user
     */
    @Query("SELECT mpp FROM MultiplayerPlayerProgress mpp WHERE mpp.session.id = :sessionId AND mpp.user.id = :userId")
    Optional<MultiplayerPlayerProgress> findBySessionIdAndUserId(@Param("sessionId") Long sessionId,
                                                                   @Param("userId") Long userId);

    /**
     * Find all progress records for a session (both players)
     */
    @Query("SELECT mpp FROM MultiplayerPlayerProgress mpp WHERE mpp.session.id = :sessionId")
    List<MultiplayerPlayerProgress> findBySessionId(@Param("sessionId") Long sessionId);

    /**
     * Find progress by session entity and user
     */
    Optional<MultiplayerPlayerProgress> findBySessionAndUser(MultiplayerGameSession session, User user);

    /**
     * Find all progress records for a session entity
     */
    List<MultiplayerPlayerProgress> findBySession(MultiplayerGameSession session);
}
