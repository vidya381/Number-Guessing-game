package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.FriendRequest;
import com.example.numberguessinggame.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    /**
     * Find pending request between two users (either direction)
     */
    @Query("SELECT fr FROM FriendRequest fr WHERE " +
           "((fr.fromUser.id = :userId1 AND fr.toUser.id = :userId2) OR " +
           "(fr.fromUser.id = :userId2 AND fr.toUser.id = :userId1)) " +
           "AND fr.status = 'PENDING'")
    Optional<FriendRequest> findPendingRequest(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    /**
     * Find all incoming pending requests for a user
     */
    @Query("SELECT fr FROM FriendRequest fr WHERE fr.toUser.id = :userId AND fr.status = :status")
    List<FriendRequest> findByToUserIdAndStatus(@Param("userId") Long userId, @Param("status") FriendRequest.Status status);

    /**
     * Find all outgoing requests from a user with specific status
     */
    @Query("SELECT fr FROM FriendRequest fr WHERE fr.fromUser.id = :userId AND fr.status = :status")
    List<FriendRequest> findByFromUserIdAndStatus(@Param("userId") Long userId, @Param("status") FriendRequest.Status status);

    /**
     * Find request by ID and verify user is the recipient
     */
    @Query("SELECT fr FROM FriendRequest fr WHERE fr.id = :requestId AND fr.toUser.id = :userId")
    Optional<FriendRequest> findByIdAndToUserId(@Param("requestId") Long requestId, @Param("userId") Long userId);

    /**
     * Find request by ID and verify user is the sender
     */
    @Query("SELECT fr FROM FriendRequest fr WHERE fr.id = :requestId AND fr.fromUser.id = :userId")
    Optional<FriendRequest> findByIdAndFromUserId(@Param("requestId") Long requestId, @Param("userId") Long userId);
}
