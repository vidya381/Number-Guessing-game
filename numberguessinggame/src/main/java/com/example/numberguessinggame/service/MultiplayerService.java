package com.example.numberguessinggame.service;

import com.example.numberguessinggame.entity.MultiplayerChallenge;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.MultiplayerChallengeRepository;
import com.example.numberguessinggame.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MultiplayerService {

    private static final Logger logger = LoggerFactory.getLogger(MultiplayerService.class);

    @Autowired
    private MultiplayerChallengeRepository challengeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendsService friendsService;

    /**
     * Create a new multiplayer challenge
     */
    @Transactional
    public Map<String, Object> createChallenge(User challenger, Long challengedId, Integer difficulty) {
        // Validate difficulty
        if (difficulty < 0 || difficulty > 2) {
            throw new IllegalArgumentException("Difficulty must be 0 (Easy), 1 (Medium), or 2 (Hard)");
        }

        // Verify challenged user exists
        User challenged = userRepository.findById(challengedId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Can't challenge yourself
        if (challenger.getId().equals(challengedId)) {
            throw new IllegalArgumentException("You cannot challenge yourself");
        }

        // Verify they are friends
        if (!friendsService.areFriends(challenger.getId(), challengedId)) {
            throw new IllegalArgumentException("You can only challenge friends");
        }

        // Check for existing pending challenge between these users
        LocalDateTime now = LocalDateTime.now();
        if (challengeRepository.findPendingChallengeBetweenUsers(
                challenger.getId(), challengedId, now).isPresent()) {
            throw new IllegalArgumentException("A pending challenge already exists between you and this user");
        }

        // Create challenge
        MultiplayerChallenge challenge = new MultiplayerChallenge(challenger, challenged, difficulty);
        challengeRepository.save(challenge);

        logger.info("Challenge created: {} challenged {} (difficulty {})",
                    challenger.getUsername(), challenged.getUsername(), difficulty);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Challenge sent successfully");
        result.put("challengeId", challenge.getId());
        result.put("expiresAt", challenge.getExpiresAt());
        return result;
    }

    /**
     * Accept a challenge (creates game session in Phase 4)
     */
    @Transactional
    public Map<String, Object> acceptChallenge(User user, Long challengeId) {
        // Find challenge and verify user is the challenged party
        MultiplayerChallenge challenge = challengeRepository.findByIdAndChallengedId(challengeId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Challenge not found"));

        // Check status
        if (challenge.getStatus() != MultiplayerChallenge.Status.PENDING) {
            throw new IllegalArgumentException("This challenge has already been processed");
        }

        // Check expiration
        if (challenge.isExpired()) {
            challenge.setStatus(MultiplayerChallenge.Status.EXPIRED);
            challengeRepository.save(challenge);
            throw new IllegalArgumentException("This challenge has expired");
        }

        // Update challenge status
        challenge.setStatus(MultiplayerChallenge.Status.ACCEPTED);
        challengeRepository.save(challenge);

        logger.info("Challenge accepted: {} accepted challenge from {}",
                    user.getUsername(), challenge.getChallenger().getUsername());

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Challenge accepted");
        result.put("challengeId", challenge.getId());
        result.put("difficulty", challenge.getDifficulty());
        result.put("opponentId", challenge.getChallenger().getId());
        result.put("opponentUsername", challenge.getChallenger().getUsername());

        // TODO Phase 4: Create game session here
        result.put("note", "Game session creation will be implemented in Phase 4");

        return result;
    }

    /**
     * Decline a challenge
     */
    @Transactional
    public Map<String, Object> declineChallenge(User user, Long challengeId) {
        MultiplayerChallenge challenge = challengeRepository.findByIdAndChallengedId(challengeId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Challenge not found"));

        if (challenge.getStatus() != MultiplayerChallenge.Status.PENDING) {
            throw new IllegalArgumentException("This challenge has already been processed");
        }

        challenge.setStatus(MultiplayerChallenge.Status.DECLINED);
        challengeRepository.save(challenge);

        logger.info("Challenge declined: {} declined challenge from {}",
                    user.getUsername(), challenge.getChallenger().getUsername());

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Challenge declined");
        return result;
    }

    /**
     * Cancel a challenge (only challenger can cancel)
     */
    @Transactional
    public Map<String, Object> cancelChallenge(User user, Long challengeId) {
        MultiplayerChallenge challenge = challengeRepository.findByIdAndChallengerId(challengeId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Challenge not found"));

        if (challenge.getStatus() != MultiplayerChallenge.Status.PENDING) {
            throw new IllegalArgumentException("This challenge has already been processed");
        }

        challenge.setStatus(MultiplayerChallenge.Status.CANCELLED);
        challengeRepository.save(challenge);

        logger.info("Challenge cancelled: {} cancelled challenge to {}",
                    user.getUsername(), challenge.getChallenged().getUsername());

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Challenge cancelled");
        return result;
    }

    /**
     * Get pending challenges for a user (received)
     */
    public List<Map<String, Object>> getPendingChallenges(User user) {
        List<MultiplayerChallenge> challenges = challengeRepository.findByChallengedIdAndStatus(
                user.getId(), MultiplayerChallenge.Status.PENDING);

        // Filter out expired challenges
        LocalDateTime now = LocalDateTime.now();
        return challenges.stream()
                .filter(c -> !c.isExpired())
                .map(challenge -> {
                    Map<String, Object> challengeInfo = new HashMap<>();
                    challengeInfo.put("id", challenge.getId());
                    challengeInfo.put("challengerId", challenge.getChallenger().getId());
                    challengeInfo.put("challengerUsername", challenge.getChallenger().getUsername());
                    challengeInfo.put("difficulty", challenge.getDifficulty());
                    challengeInfo.put("createdAt", challenge.getCreatedAt());
                    challengeInfo.put("expiresAt", challenge.getExpiresAt());
                    return challengeInfo;
                })
                .collect(Collectors.toList());
    }

    /**
     * Get sent challenges (outgoing)
     */
    public List<Map<String, Object>> getSentChallenges(User user) {
        List<MultiplayerChallenge> challenges = challengeRepository.findByChallengerIdAndStatus(
                user.getId(), MultiplayerChallenge.Status.PENDING);

        LocalDateTime now = LocalDateTime.now();
        return challenges.stream()
                .filter(c -> !c.isExpired())
                .map(challenge -> {
                    Map<String, Object> challengeInfo = new HashMap<>();
                    challengeInfo.put("id", challenge.getId());
                    challengeInfo.put("challengedId", challenge.getChallenged().getId());
                    challengeInfo.put("challengedUsername", challenge.getChallenged().getUsername());
                    challengeInfo.put("difficulty", challenge.getDifficulty());
                    challengeInfo.put("createdAt", challenge.getCreatedAt());
                    challengeInfo.put("expiresAt", challenge.getExpiresAt());
                    return challengeInfo;
                })
                .collect(Collectors.toList());
    }

    /**
     * Scheduled task to expire old challenges
     * Runs every 5 minutes
     */
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void expireChallenges() {
        LocalDateTime now = LocalDateTime.now();
        List<MultiplayerChallenge> expiredChallenges = challengeRepository.findExpiredChallenges(now);

        if (!expiredChallenges.isEmpty()) {
            for (MultiplayerChallenge challenge : expiredChallenges) {
                challenge.setStatus(MultiplayerChallenge.Status.EXPIRED);
            }
            challengeRepository.saveAll(expiredChallenges);
            logger.info("Expired {} challenges", expiredChallenges.size());
        }
    }
}
