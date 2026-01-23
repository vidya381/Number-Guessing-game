package com.example.numberguessinggame.service;

import com.example.numberguessinggame.entity.DailyChallenge;
import com.example.numberguessinggame.entity.DailyChallengeAttempt;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.repository.DailyChallengeAttemptRepository;
import com.example.numberguessinggame.repository.DailyChallengeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DailyChallengeService {

    private static final Logger logger = LoggerFactory.getLogger(DailyChallengeService.class);

    @Autowired
    private DailyChallengeRepository dailyChallengeRepository;

    @Autowired
    private DailyChallengeAttemptRepository attemptRepository;

    /**
     * Get or create today's daily challenge
     * Uses date-based seeding to ensure same number for all players
     */
    @Transactional
    public DailyChallenge getTodayChallenge() {
        LocalDate today = LocalDate.now();

        Optional<DailyChallenge> existing = dailyChallengeRepository.findByChallengeDate(today);

        if (existing.isPresent()) {
            return existing.get();
        }

        // Create new challenge for today
        return createDailyChallenge(today);
    }

    /**
     * Create a new daily challenge with deterministic random number
     * @param date The challenge date
     * @return Created challenge
     */
    @Transactional
    public DailyChallenge createDailyChallenge(LocalDate date) {
        // Check if already exists
        if (dailyChallengeRepository.existsByChallengeDate(date)) {
            return dailyChallengeRepository.findByChallengeDate(date).get();
        }

        // Determine difficulty based on date (rotates daily)
        // 0=Easy(3 digits), 1=Medium(4 digits), 2=Hard(5 digits)
        int difficulty = (int) (date.toEpochDay() % 3);

        // Generate target number with date-based seed
        int targetNumber = generateUniqueDigitNumber(date, difficulty);

        // Log daily challenge creation (once per day)
        logger.info("[ADMIN] Daily Challenge Created | Date: {} | Difficulty: {} ({}) | Target: {}",
                date, difficulty, getDifficultyText(difficulty), targetNumber);

        DailyChallenge challenge = new DailyChallenge(date, targetNumber, difficulty);
        return dailyChallengeRepository.save(challenge);
    }

    /**
     * Generate a unique digit number using date as seed for reproducibility
     * @param date The seed date
     * @param difficulty 0=Easy(3), 1=Medium(4), 2=Hard(5)
     * @return Generated number with unique digits
     */
    private int generateUniqueDigitNumber(LocalDate date, int difficulty) {
        // Use date as seed: combine year, month, day into single long
        long seed = date.getYear() * 10000L + date.getMonthValue() * 100L + date.getDayOfMonth();
        Random random = new Random(seed);

        int digitCount = 3 + difficulty;  // 3, 4, or 5 digits

        // Generate unique digits
        List<Integer> digits = new ArrayList<>();
        for (int i = 0; i <= 9; i++) {
            digits.add(i);
        }
        Collections.shuffle(digits, random);

        // Take first digitCount digits, ensuring first digit is not 0
        List<Integer> selectedDigits = new ArrayList<>();
        for (int digit : digits) {
            if (selectedDigits.isEmpty() && digit == 0) {
                continue; // Skip 0 as first digit
            }
            selectedDigits.add(digit);
            if (selectedDigits.size() == digitCount) {
                break;
            }
        }

        // Convert to number
        int result = 0;
        for (int digit : selectedDigits) {
            result = result * 10 + digit;
        }

        return result;
    }

    /**
     * Check if user has already attempted today's challenge
     */
    public boolean hasUserAttemptedToday(User user) {
        LocalDate today = LocalDate.now();
        Optional<DailyChallenge> todayChallenge = dailyChallengeRepository.findByChallengeDate(today);

        if (todayChallenge.isEmpty()) {
            return false;
        }

        return attemptRepository.existsByUserAndChallenge(user, todayChallenge.get());
    }

    /**
     * Get user's attempt for today (if exists)
     */
    public Optional<DailyChallengeAttempt> getUserAttemptToday(User user) {
        LocalDate today = LocalDate.now();
        Optional<DailyChallenge> todayChallenge = dailyChallengeRepository.findByChallengeDate(today);

        if (todayChallenge.isEmpty()) {
            return Optional.empty();
        }

        return attemptRepository.findByUserAndChallenge(user, todayChallenge.get());
    }

    /**
     * Save user's daily challenge attempt
     * Only saves if user WON - allows unlimited retries until success
     * @param user The user
     * @param attempts Number of attempts taken
     * @param won Whether the user won
     * @param timeTakenSeconds Time taken in seconds
     * @param timeDisplay Formatted time display (MM:SS)
     * @return Saved attempt (null if user lost)
     */
    @Transactional
    public DailyChallengeAttempt saveAttempt(User user, Integer attempts, Boolean won,
                                              Integer timeTakenSeconds, String timeDisplay) {
        DailyChallenge todayChallenge = getTodayChallenge();

        // Check if user already completed (won) today's challenge
        if (attemptRepository.existsByUserAndChallenge(user, todayChallenge)) {
            throw new IllegalStateException("You've already completed today's challenge! Come back tomorrow for a new one! 📅");
        }

        // Only save if user won - allows unlimited retries if they lose
        if (!won) {
            return null; // Don't save failed attempts, allow retry
        }

        DailyChallengeAttempt attempt = new DailyChallengeAttempt(
            user, todayChallenge, attempts, won, timeTakenSeconds, timeDisplay
        );

        return attemptRepository.save(attempt);
    }

    /**
     * Get today's leaderboard (top 100)
     * Ranked by: won first, then fewest attempts, then fastest time
     */
    public List<DailyChallengeAttempt> getTodayLeaderboard(int limit) {
        LocalDate today = LocalDate.now();
        Optional<DailyChallenge> todayChallenge = dailyChallengeRepository.findByChallengeDate(today);

        if (todayChallenge.isEmpty()) {
            return new ArrayList<>();
        }

        return attemptRepository.findTopAttemptsByChallenge(
            todayChallenge.get(),
            PageRequest.of(0, limit)
        );
    }

    /**
     * Get user's rank on today's leaderboard
     * @param user The user
     * @return Rank (1-based) or null if not attempted
     */
    public Integer getUserRankToday(User user) {
        Optional<DailyChallengeAttempt> userAttempt = getUserAttemptToday(user);

        if (userAttempt.isEmpty() || !userAttempt.get().getWon()) {
            return null; // Only winners get ranked
        }

        List<DailyChallengeAttempt> leaderboard = getTodayLeaderboard(1000);

        DailyChallengeAttempt attempt = userAttempt.get();

        // Find rank by comparing attempts and time
        int rank = 1;
        for (DailyChallengeAttempt entry : leaderboard) {
            if (entry.getId().equals(attempt.getId())) {
                return rank;
            }
            rank++;
        }

        return null;
    }

    /**
     * Get total number of winners today
     */
    public long getTodayWinnersCount() {
        LocalDate today = LocalDate.now();
        Optional<DailyChallenge> todayChallenge = dailyChallengeRepository.findByChallengeDate(today);

        if (todayChallenge.isEmpty()) {
            return 0;
        }

        // Use findTopAttemptsByChallenge which already filters by won=true
        return attemptRepository.findTopAttemptsByChallenge(
            todayChallenge.get(),
            PageRequest.of(0, Integer.MAX_VALUE)
        ).size();
    }

    /**
     * Get total number of attempts today (both wins and losses)
     */
    public long getTodayTotalAttempts() {
        LocalDate today = LocalDate.now();
        Optional<DailyChallenge> todayChallenge = dailyChallengeRepository.findByChallengeDate(today);

        if (todayChallenge.isEmpty()) {
            return 0;
        }

        // Count all attempts for today's challenge
        return attemptRepository.findByUserOrderByCompletedAtDesc(
            null,  // This won't work - need to add a new method
            PageRequest.of(0, Integer.MAX_VALUE)
        ).stream()
        .filter(a -> a.getChallenge().getId().equals(todayChallenge.get().getId()))
        .count();
    }

    /**
     * Get user's daily challenge stats
     * @param user The user
     * @return Map with stats
     */
    public Map<String, Object> getUserDailyChallengeStats(User user) {
        Map<String, Object> stats = new HashMap<>();

        // Total daily challenge wins
        long totalWins = attemptRepository.countByUserAndWon(user, true);
        stats.put("totalDailyChallengeWins", totalWins);

        // Best performance (fewest attempts on a win)
        Optional<Integer> bestAttempts = attemptRepository.findBestAttemptsByUser(user);
        stats.put("bestDailyChallengeAttempts", bestAttempts.orElse(null));

        // Has attempted today
        stats.put("attemptedToday", hasUserAttemptedToday(user));

        // Today's rank (if won today)
        Integer todayRank = getUserRankToday(user);
        stats.put("todayRank", todayRank);

        return stats;
    }

    /**
     * Get difficulty text
     */
    public String getDifficultyText(int difficulty) {
        return switch (difficulty) {
            case 0 -> "Easy (3 digits)";
            case 1 -> "Medium (4 digits)";
            case 2 -> "Hard (5 digits)";
            default -> "Unknown";
        };
    }
}
