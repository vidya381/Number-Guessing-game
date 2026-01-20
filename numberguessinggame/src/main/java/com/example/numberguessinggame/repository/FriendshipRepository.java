package com.example.numberguessinggame.repository;

import com.example.numberguessinggame.entity.Friendship;
import com.example.numberguessinggame.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    /**
     * Find all friends for a user (bidirectional lookup)
     */
    @Query("SELECT f FROM Friendship f WHERE f.user.id = :userId")
    List<Friendship> findByUserId(@Param("userId") Long userId);

    /**
     * Check if two users are friends (bidirectional check)
     */
    @Query("SELECT f FROM Friendship f WHERE (f.user.id = :userId AND f.friend.id = :friendId)")
    Optional<Friendship> findByUserIdAndFriendId(@Param("userId") Long userId, @Param("friendId") Long friendId);

    /**
     * Check if friendship exists in either direction
     */
    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM Friendship f " +
           "WHERE (f.user.id = :userId AND f.friend.id = :friendId) " +
           "OR (f.user.id = :friendId AND f.friend.id = :userId)")
    boolean areFriends(@Param("userId") Long userId, @Param("friendId") Long friendId);

    /**
     * Delete friendship by user and friend
     */
    void deleteByUserAndFriend(User user, User friend);
}
