package com.example.numberguessinggame.service;

import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional
    public User registerUser(String username, String email, String password) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("That username is taken. How about trying a different one?");
        }

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("This email is already registered. Try logging in instead!");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setTotalGames(0);
        user.setTotalWins(0);

        return userRepository.save(user);
    }

    public String authenticateUser(String username, String password) {
        Optional<User> userOptional = userRepository.findByUsername(username);

        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("Username or password doesn't match. Double-check and try again!");
        }

        User user = userOptional.get();

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Username or password doesn't match. Double-check and try again!");
        }

        return jwtUtil.generateToken(user.getUsername(), user.getId());
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Transactional
    public void updateUserStats(Long userId, boolean won, int attempts) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Couldn't find your account. Try logging in again!"));

        LocalDate today = LocalDate.now();
        LocalDate lastPlayed = user.getLastPlayedDate();

        // Initialize play day streak fields if null (for existing users)
        if (user.getConsecutivePlayDays() == null) {
            user.setConsecutivePlayDays(0);
        }
        if (user.getBestPlayDayStreak() == null) {
            user.setBestPlayDayStreak(0);
        }

        // Update play day streak
        if (lastPlayed == null) {
            // First time playing
            user.setConsecutivePlayDays(1);
            user.setBestPlayDayStreak(1);
        } else if (!lastPlayed.equals(today)) {
            // Check if it's a consecutive day
            long daysBetween = ChronoUnit.DAYS.between(lastPlayed, today);

            if (daysBetween == 1) {
                // Consecutive day - increment streak
                user.setConsecutivePlayDays(user.getConsecutivePlayDays() + 1);

                // Update best play day streak if current is better
                if (user.getConsecutivePlayDays() > user.getBestPlayDayStreak()) {
                    user.setBestPlayDayStreak(user.getConsecutivePlayDays());
                }
            } else if (daysBetween > 1) {
                // Streak broken - reset to 1
                user.setConsecutivePlayDays(1);
            }
            // If daysBetween == 0 (same day), don't update consecutive days
        }

        // Update last played date (only if it's a new day)
        if (lastPlayed == null || !lastPlayed.equals(today)) {
            user.setLastPlayedDate(today);
        }

        // Update total games
        user.setTotalGames(user.getTotalGames() + 1);

        // Update win-related stats
        if (won) {
            user.setTotalWins(user.getTotalWins() + 1);

            // Update best score
            if (user.getBestScore() == null || attempts < user.getBestScore()) {
                user.setBestScore(attempts);
            }

            // Initialize win streak fields if null (for existing users)
            if (user.getCurrentWinStreak() == null) {
                user.setCurrentWinStreak(0);
            }
            if (user.getBestWinStreak() == null) {
                user.setBestWinStreak(0);
            }

            // Update win streak
            user.setCurrentWinStreak(user.getCurrentWinStreak() + 1);

            // Update best win streak if current is better
            if (user.getCurrentWinStreak() > user.getBestWinStreak()) {
                user.setBestWinStreak(user.getCurrentWinStreak());
            }
        } else {
            // Lost - reset win streak
            user.setCurrentWinStreak(0);
        }

        userRepository.save(user);
    }

    /**
     * Award coins to user based on difficulty
     * Easy: 3 coins, Medium: 6 coins, Hard: 9 coins
     */
    @Transactional
    public int awardCoins(Long userId, int difficulty) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        int coinsToAward = switch(difficulty) {
            case 0 -> 3;  // Easy
            case 1 -> 6;  // Medium
            case 2 -> 9;  // Hard
            default -> 3;
        };

        user.addCoins(coinsToAward);
        userRepository.save(user);

        return coinsToAward;
    }

    /**
     * Award multiple coins (for Time Attack session totals)
     */
    @Transactional
    public void awardCoinsAmount(Long userId, int amount) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.addCoins(amount);
        userRepository.save(user);
    }

    /**
     * Verify if the provided password matches the user's password
     */
    public boolean verifyPassword(User user, String password) {
        return passwordEncoder.matches(password, user.getPassword());
    }

    /**
     * Update user's password
     */
    @Transactional
    public void updatePassword(User user, String newPassword) {
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    /**
     * Update user's email
     */
    @Transactional
    public void updateEmail(User user, String newEmail) {
        user.setEmail(newEmail);
        userRepository.save(user);
    }

    /**
     * Check if email exists
     */
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    /**
     * Delete user account and all related data
     */
    @Transactional
    public void deleteAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        userRepository.delete(user);
    }
}
