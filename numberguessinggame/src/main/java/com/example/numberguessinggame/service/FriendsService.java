package com.example.numberguessinggame.service;

import com.example.numberguessinggame.entity.FriendRequest;
import com.example.numberguessinggame.entity.Friendship;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.FriendRequestRepository;
import com.example.numberguessinggame.repository.FriendshipRepository;
import com.example.numberguessinggame.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class FriendsService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendshipRepository friendshipRepository;

    @Autowired
    private FriendRequestRepository friendRequestRepository;

    /**
     * Search users by username (limit to 20 results)
     * Returns users with their relationship status to current user
     */
    public List<Map<String, Object>> searchUsers(String query, User currentUser) {
        if (query == null || query.trim().isEmpty() || query.length() < 2) {
            return new ArrayList<>();
        }

        // Find all users matching the query (case-insensitive)
        List<User> allUsers = userRepository.findAll();
        List<User> matchingUsers = allUsers.stream()
                .filter(u -> !u.getId().equals(currentUser.getId())) // Exclude current user
                .filter(u -> u.getUsername().toLowerCase().contains(query.toLowerCase()))
                .limit(20)
                .collect(Collectors.toList());

        // Get relationship status for each user
        return matchingUsers.stream()
                .map(user -> {
                    Map<String, Object> userInfo = new HashMap<>();
                    userInfo.put("id", user.getId());
                    userInfo.put("username", user.getUsername());
                    userInfo.put("totalGames", user.getTotalGames());
                    userInfo.put("totalWins", user.getTotalWins());

                    // Check relationship status
                    String relationshipStatus = getRelationshipStatus(currentUser.getId(), user.getId());
                    userInfo.put("relationshipStatus", relationshipStatus);

                    return userInfo;
                })
                .collect(Collectors.toList());
    }

    /**
     * Get relationship status between two users
     */
    private String getRelationshipStatus(Long userId, Long otherUserId) {
        // Check if already friends
        if (friendshipRepository.areFriends(userId, otherUserId)) {
            return "FRIENDS";
        }

        // Check for pending request
        Optional<FriendRequest> pendingRequest = friendRequestRepository.findPendingRequest(userId, otherUserId);
        if (pendingRequest.isPresent()) {
            FriendRequest request = pendingRequest.get();
            if (request.getFromUser().getId().equals(userId)) {
                return "REQUEST_SENT";
            } else {
                return "REQUEST_RECEIVED";
            }
        }

        return "NONE";
    }

    /**
     * Send a friend request
     */
    @Transactional
    public Map<String, Object> sendFriendRequest(User fromUser, Long toUserId) {
        // Validate target user exists
        User toUser = userRepository.findById(toUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Can't send request to yourself
        if (fromUser.getId().equals(toUserId)) {
            throw new IllegalArgumentException("You cannot send a friend request to yourself");
        }

        // Check if already friends
        if (friendshipRepository.areFriends(fromUser.getId(), toUserId)) {
            throw new IllegalArgumentException("You are already friends with this user");
        }

        // Check for existing pending request
        Optional<FriendRequest> existingRequest = friendRequestRepository.findPendingRequest(fromUser.getId(), toUserId);
        if (existingRequest.isPresent()) {
            throw new IllegalArgumentException("A friend request already exists between you and this user");
        }

        // Create new friend request
        FriendRequest friendRequest = new FriendRequest(fromUser, toUser);
        friendRequestRepository.save(friendRequest);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Friend request sent successfully");
        result.put("requestId", friendRequest.getId());
        return result;
    }

    /**
     * Accept a friend request - creates bidirectional friendships
     */
    @Transactional
    public Map<String, Object> acceptFriendRequest(User user, Long requestId) {
        // Find the request and verify user is the recipient
        FriendRequest request = friendRequestRepository.findByIdAndToUserId(requestId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found"));

        if (request.getStatus() != FriendRequest.Status.PENDING) {
            throw new IllegalArgumentException("This friend request has already been processed");
        }

        // Update request status
        request.setStatus(FriendRequest.Status.ACCEPTED);
        friendRequestRepository.save(request);

        // Create bidirectional friendships
        Friendship friendship1 = new Friendship(user, request.getFromUser());
        Friendship friendship2 = new Friendship(request.getFromUser(), user);

        friendshipRepository.save(friendship1);
        friendshipRepository.save(friendship2);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Friend request accepted");
        result.put("friendId", request.getFromUser().getId());
        result.put("friendUsername", request.getFromUser().getUsername());
        return result;
    }

    /**
     * Decline a friend request
     */
    @Transactional
    public Map<String, Object> declineFriendRequest(User user, Long requestId) {
        FriendRequest request = friendRequestRepository.findByIdAndToUserId(requestId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found"));

        if (request.getStatus() != FriendRequest.Status.PENDING) {
            throw new IllegalArgumentException("This friend request has already been processed");
        }

        request.setStatus(FriendRequest.Status.DECLINED);
        friendRequestRepository.save(request);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Friend request declined");
        return result;
    }

    /**
     * Remove a friend - deletes both directions
     */
    @Transactional
    public Map<String, Object> removeFriend(User user, Long friendId) {
        User friend = userRepository.findById(friendId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Verify they are friends
        if (!friendshipRepository.areFriends(user.getId(), friendId)) {
            throw new IllegalArgumentException("You are not friends with this user");
        }

        // Delete both directions of friendship
        friendshipRepository.deleteByUserAndFriend(user, friend);
        friendshipRepository.deleteByUserAndFriend(friend, user);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Friend removed successfully");
        return result;
    }

    /**
     * Get list of friends for a user
     */
    public List<Map<String, Object>> getFriends(User user) {
        List<Friendship> friendships = friendshipRepository.findByUserId(user.getId());

        return friendships.stream()
                .map(friendship -> {
                    User friend = friendship.getFriend();
                    Map<String, Object> friendInfo = new HashMap<>();
                    friendInfo.put("id", friend.getId());
                    friendInfo.put("username", friend.getUsername());
                    friendInfo.put("totalGames", friend.getTotalGames());
                    friendInfo.put("totalWins", friend.getTotalWins());
                    friendInfo.put("createdAt", friendship.getCreatedAt());
                    return friendInfo;
                })
                .collect(Collectors.toList());
    }

    /**
     * Get pending friend requests for a user
     */
    public List<Map<String, Object>> getPendingRequests(User user) {
        List<FriendRequest> requests = friendRequestRepository.findByToUserIdAndStatus(
                user.getId(), FriendRequest.Status.PENDING);

        return requests.stream()
                .map(request -> {
                    User fromUser = request.getFromUser();
                    Map<String, Object> requestInfo = new HashMap<>();
                    requestInfo.put("id", request.getId());
                    requestInfo.put("fromUserId", fromUser.getId());
                    requestInfo.put("fromUsername", fromUser.getUsername());
                    requestInfo.put("createdAt", request.getCreatedAt());
                    return requestInfo;
                })
                .collect(Collectors.toList());
    }
}
