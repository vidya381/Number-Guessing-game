package com.example.numberguessinggame.service;

import com.example.numberguessinggame.entity.Achievement;
import com.example.numberguessinggame.entity.Achievement.AchievementCategory;
import com.example.numberguessinggame.entity.Achievement.AchievementType;
import com.example.numberguessinggame.entity.Game;
import com.example.numberguessinggame.entity.User;
import com.example.numberguessinggame.entity.UserAchievement;
import com.example.numberguessinggame.repository.AchievementRepository;
import com.example.numberguessinggame.repository.GameRepository;
import com.example.numberguessinggame.repository.UserAchievementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class AchievementService {

    @Autowired
    private AchievementRepository achievementRepository;

    @Autowired
    private UserAchievementRepository userAchievementRepository;

    @Autowired
    private GameRepository gameRepository;

    /**
     * Check and unlock achievements after a game
     * Called from GameController.saveGameToDatabase()
     */
    public List<Achievement> checkAndUnlockAchievements(User user, Game game) {
        List<Achievement> newlyUnlocked = new ArrayList<>();

        // Get already unlocked achievement IDs for efficiency
        List<Long> unlockedIds = userAchievementRepository.findAchievementIdsByUser(user);

        // Check each category of achievements
        newlyUnlocked.addAll(checkMilestoneAchievements(user, unlockedIds));
        newlyUnlocked.addAll(checkSkillAchievements(user, game, unlockedIds));
        newlyUnlocked.addAll(checkDifficultyAchievements(user, game, unlockedIds));

        return newlyUnlocked;
    }

    /**
     * Retroactively award achievements based on game history
     * Called on first login after achievement system is deployed
     */
    public List<Achievement> awardRetroactiveAchievements(User user) {
        List<Achievement> newlyUnlocked = new ArrayList<>();
        List<Long> unlockedIds = userAchievementRepository.findAchievementIdsByUser(user);

        // Process all achievement types
        newlyUnlocked.addAll(checkMilestoneAchievements(user, unlockedIds));
        newlyUnlocked.addAll(checkRetroactiveSkillAchievements(user, unlockedIds));
        newlyUnlocked.addAll(checkRetroactiveDifficultyAchievements(user, unlockedIds));

        return newlyUnlocked;
    }

    /**
     * Get user's achievement summary for badge
     */
    public Map<String, Object> getUserAchievementSummary(User user) {
        // Check if user has ANY achievements
        long totalCount = userAchievementRepository.countByUser(user);

        // If user has 0 achievements but has played games, trigger retroactive
        if (totalCount == 0 && user.getTotalGames() != null && user.getTotalGames() > 0) {
            awardRetroactiveAchievements(user);
            totalCount = userAchievementRepository.countByUser(user);
        }

        long totalAvailable = achievementRepository.findByActiveTrue().size();
        long unnotified = userAchievementRepository.countUnnotifiedByUser(user);

        Map<String, Object> summary = new HashMap<>();
        summary.put("unlockedCount", totalCount);
        summary.put("totalCount", totalAvailable);
        summary.put("percentage", totalAvailable > 0 ? (totalCount * 100.0 / totalAvailable) : 0);
        summary.put("newCount", unnotified);

        return summary;
    }

    /**
     * Get detailed achievement list with unlock status
     */
    public List<Map<String, Object>> getUserAchievements(User user) {
        List<Achievement> allAchievements = achievementRepository.findByActiveTrue();
        List<Long> unlockedIds = userAchievementRepository.findAchievementIdsByUser(user);
        Map<Long, LocalDateTime> unlockDates = getUserAchievementUnlockDates(user);

        return allAchievements.stream()
            .map(achievement -> {
                Map<String, Object> data = new HashMap<>();
                data.put("id", achievement.getId());
                data.put("code", achievement.getCode());
                data.put("name", achievement.getName());
                data.put("description", achievement.getDescription());
                data.put("type", achievement.getType().toString());
                data.put("category", achievement.getCategory().toString());
                data.put("iconClass", achievement.getIconClass());
                data.put("iconColor", achievement.getIconColor());
                data.put("points", achievement.getPoints());
                data.put("unlocked", unlockedIds.contains(achievement.getId()));
                data.put("unlockedAt", unlockDates.get(achievement.getId()));
                return data;
            })
            .collect(Collectors.toList());
    }

    /**
     * Check milestone achievements (games played, wins)
     */
    private List<Achievement> checkMilestoneAchievements(User user, List<Long> unlockedIds) {
        List<Achievement> newlyUnlocked = new ArrayList<>();
        List<Achievement> milestoneAchievements = achievementRepository.findByTypeAndActiveTrue(AchievementType.MILESTONE);

        for (Achievement achievement : milestoneAchievements) {
            if (unlockedIds.contains(achievement.getId())) {
                continue; // Already unlocked
            }

            boolean shouldUnlock = false;

            if (achievement.getCategory() == AchievementCategory.GAMES) {
                // Check total games milestone
                shouldUnlock = user.getTotalGames() != null &&
                              user.getTotalGames() >= achievement.getThresholdValue();
            } else if (achievement.getCategory() == AchievementCategory.WINS) {
                // Check total wins milestone
                shouldUnlock = user.getTotalWins() != null &&
                              user.getTotalWins() >= achievement.getThresholdValue();
            }

            if (shouldUnlock) {
                unlockAchievement(user, achievement);
                newlyUnlocked.add(achievement);
                unlockedIds.add(achievement.getId()); // Update for next checks
            }
        }

        return newlyUnlocked;
    }

    /**
     * Check skill-based achievements for the current game
     */
    private List<Achievement> checkSkillAchievements(User user, Game game, List<Long> unlockedIds) {
        List<Achievement> newlyUnlocked = new ArrayList<>();

        if (!game.getWon()) {
            return newlyUnlocked; // Skill achievements only for wins
        }

        List<Achievement> skillAchievements = achievementRepository.findByTypeAndActiveTrue(AchievementType.SKILL);

        for (Achievement achievement : skillAchievements) {
            if (unlockedIds.contains(achievement.getId())) {
                continue;
            }

            boolean shouldUnlock = false;

            if (achievement.getCategory() == AchievementCategory.ATTEMPTS) {
                // Check if this game meets attempts criteria
                if ("PERFECT_SCORE".equals(achievement.getCode())) {
                    shouldUnlock = game.getAttempts() <= 3;
                } else if ("EFFICIENT_PLAYER".equals(achievement.getCode())) {
                    // Check if user has 10+ wins with <=5 attempts
                    long efficientWins = gameRepository.findByUserAndWonTrue(user).stream()
                        .filter(g -> g.getAttempts() <= 5)
                        .count();
                    shouldUnlock = efficientWins >= 10;
                } else if ("CLOSE_CALL".equals(achievement.getCode())) {
                    // Win on exactly 10th attempt
                    shouldUnlock = game.getAttempts() == 10;
                } else if ("EARLY_BIRD_VICTORY".equals(achievement.getCode())) {
                    // Win within first 3 attempts
                    shouldUnlock = game.getAttempts() <= 3;
                } else if ("LUCKY_SEVEN".equals(achievement.getCode())) {
                    // Win on exactly 7th attempt
                    shouldUnlock = game.getAttempts() == 7;
                } else if ("MIRACLE_GUESS".equals(achievement.getCode())) {
                    // Win on first attempt
                    shouldUnlock = game.getAttempts() == 1;
                } else if ("TWO_GUESS_WONDER".equals(achievement.getCode())) {
                    // Win in exactly 2 attempts
                    shouldUnlock = game.getAttempts() == 2;
                } else if ("PERFECT_TRIFECTA".equals(achievement.getCode())) {
                    // Win 3 consecutive perfect games (3 or fewer attempts)
                    List<Game> recentWins = gameRepository.findByUserAndWonTrue(user).stream()
                        .sorted((g1, g2) -> g2.getPlayedAt().compareTo(g1.getPlayedAt()))
                        .limit(3)
                        .collect(Collectors.toList());
                    if (recentWins.size() >= 3) {
                        shouldUnlock = recentWins.stream().allMatch(g -> g.getAttempts() <= 3);
                    }
                }
            } else if (achievement.getCategory() == AchievementCategory.TIME) {
                // Check time-based achievements
                if (game.getTimeTaken() != null) {
                    int timeInSeconds = parseTimeToSeconds(game.getTimeTaken());
                    if ("SPEED_RUNNER".equals(achievement.getCode())) {
                        shouldUnlock = timeInSeconds < 120; // Under 2 minutes
                    } else if ("LIGHTNING_FAST".equals(achievement.getCode())) {
                        shouldUnlock = timeInSeconds < 60; // Under 1 minute
                    } else if ("INSTANT_WIN".equals(achievement.getCode())) {
                        // Win in under 30 seconds
                        shouldUnlock = timeInSeconds < 30;
                    } else if ("TIME_ATTACK_MASTER".equals(achievement.getCode())) {
                        // Win 10 games in under 2 minutes each
                        long fastWins = gameRepository.findByUserAndWonTrue(user).stream()
                            .filter(g -> g.getTimeTaken() != null && parseTimeToSeconds(g.getTimeTaken()) < 120)
                            .count();
                        shouldUnlock = fastWins >= 10;
                    } else if ("MORNING_GLORY".equals(achievement.getCode())) {
                        // Win 5 games between 6AM and 9AM
                        long morningWins = gameRepository.findByUserAndWonTrue(user).stream()
                            .filter(g -> isTimeInRange(g.getPlayedAt(), 6, 9))
                            .count();
                        shouldUnlock = morningWins >= 5;
                    } else if ("MIDNIGHT_WARRIOR".equals(achievement.getCode())) {
                        // Win 5 games between 12AM and 3AM
                        long midnightWins = gameRepository.findByUserAndWonTrue(user).stream()
                            .filter(g -> isTimeInRange(g.getPlayedAt(), 0, 3))
                            .count();
                        shouldUnlock = midnightWins >= 5;
                    } else if ("LUNCH_BREAK_PRO".equals(achievement.getCode())) {
                        // Win 5 games between 12PM and 2PM
                        long lunchWins = gameRepository.findByUserAndWonTrue(user).stream()
                            .filter(g -> isTimeInRange(g.getPlayedAt(), 12, 14))
                            .count();
                        shouldUnlock = lunchWins >= 5;
                    } else if ("EVENING_EXPERT".equals(achievement.getCode())) {
                        // Win 5 games between 6PM and 9PM
                        long eveningWins = gameRepository.findByUserAndWonTrue(user).stream()
                            .filter(g -> isTimeInRange(g.getPlayedAt(), 18, 21))
                            .count();
                        shouldUnlock = eveningWins >= 5;
                    }
                }
            } else if (achievement.getCategory() == AchievementCategory.STREAK) {
                // Check streak achievements
                if ("CONSISTENCY_KING".equals(achievement.getCode())) {
                    // Check if user has 5+ consecutive wins
                    shouldUnlock = user.getCurrentWinStreak() >= 5;
                } else if ("UNSTOPPABLE_STREAK".equals(achievement.getCode())) {
                    // Win 10 consecutive games
                    shouldUnlock = user.getCurrentWinStreak() >= 10;
                } else if ("COMEBACK_VICTORY".equals(achievement.getCode())) {
                    // Win after losing 3 games in a row
                    shouldUnlock = checkForComebackAfterLosses(user, 3);
                } else if ("PHOENIX_RISING".equals(achievement.getCode())) {
                    // Win after losing 5 games in a row
                    shouldUnlock = checkForComebackAfterLosses(user, 5);
                }
            }

            if (shouldUnlock) {
                unlockAchievement(user, achievement);
                newlyUnlocked.add(achievement);
                unlockedIds.add(achievement.getId());
            }
        }

        return newlyUnlocked;
    }

    /**
     * Check retroactive skill achievements (scan all games)
     */
    private List<Achievement> checkRetroactiveSkillAchievements(User user, List<Long> unlockedIds) {
        List<Achievement> newlyUnlocked = new ArrayList<>();
        List<Achievement> skillAchievements = achievementRepository.findByTypeAndActiveTrue(AchievementType.SKILL);
        List<Game> userGames = gameRepository.findByUserAndWonTrue(user);
        List<Game> allGames = gameRepository.findByUser(user);

        for (Achievement achievement : skillAchievements) {
            if (unlockedIds.contains(achievement.getId())) {
                continue;
            }

            boolean shouldUnlock = false;

            if (achievement.getCategory() == AchievementCategory.ATTEMPTS) {
                if ("PERFECT_SCORE".equals(achievement.getCode())) {
                    // Check if any game had <=3 attempts
                    shouldUnlock = userGames.stream().anyMatch(g -> g.getAttempts() <= 3);
                } else if ("EFFICIENT_PLAYER".equals(achievement.getCode())) {
                    // Check if 10+ wins with <=5 attempts
                    long efficientWins = userGames.stream()
                        .filter(g -> g.getAttempts() <= 5)
                        .count();
                    shouldUnlock = efficientWins >= 10;
                } else if ("CLOSE_CALL".equals(achievement.getCode())) {
                    // Win on exactly 10th attempt
                    shouldUnlock = userGames.stream().anyMatch(g -> g.getAttempts() == 10);
                } else if ("EARLY_BIRD_VICTORY".equals(achievement.getCode())) {
                    // Win within first 3 attempts
                    shouldUnlock = userGames.stream().anyMatch(g -> g.getAttempts() <= 3);
                } else if ("LUCKY_SEVEN".equals(achievement.getCode())) {
                    // Win on exactly 7th attempt
                    shouldUnlock = userGames.stream().anyMatch(g -> g.getAttempts() == 7);
                } else if ("MIRACLE_GUESS".equals(achievement.getCode())) {
                    // Win on first attempt
                    shouldUnlock = userGames.stream().anyMatch(g -> g.getAttempts() == 1);
                } else if ("TWO_GUESS_WONDER".equals(achievement.getCode())) {
                    // Win in exactly 2 attempts
                    shouldUnlock = userGames.stream().anyMatch(g -> g.getAttempts() == 2);
                } else if ("PERFECT_TRIFECTA".equals(achievement.getCode())) {
                    // Check for any sequence of 3 consecutive perfect games
                    shouldUnlock = checkForConsecutivePerfectGames(userGames, 3);
                }
            } else if (achievement.getCategory() == AchievementCategory.TIME) {
                if ("SPEED_RUNNER".equals(achievement.getCode())) {
                    shouldUnlock = userGames.stream()
                        .filter(g -> g.getTimeTaken() != null)
                        .anyMatch(g -> parseTimeToSeconds(g.getTimeTaken()) < 120);
                } else if ("LIGHTNING_FAST".equals(achievement.getCode())) {
                    shouldUnlock = userGames.stream()
                        .filter(g -> g.getTimeTaken() != null)
                        .anyMatch(g -> parseTimeToSeconds(g.getTimeTaken()) < 60);
                } else if ("INSTANT_WIN".equals(achievement.getCode())) {
                    // Win in under 30 seconds
                    shouldUnlock = userGames.stream()
                        .filter(g -> g.getTimeTaken() != null)
                        .anyMatch(g -> parseTimeToSeconds(g.getTimeTaken()) < 30);
                } else if ("TIME_ATTACK_MASTER".equals(achievement.getCode())) {
                    // Win 10 games in under 2 minutes each
                    long fastWins = userGames.stream()
                        .filter(g -> g.getTimeTaken() != null && parseTimeToSeconds(g.getTimeTaken()) < 120)
                        .count();
                    shouldUnlock = fastWins >= 10;
                } else if ("MORNING_GLORY".equals(achievement.getCode())) {
                    // Win 5 games between 6AM and 9AM
                    long morningWins = userGames.stream()
                        .filter(g -> isTimeInRange(g.getPlayedAt(), 6, 9))
                        .count();
                    shouldUnlock = morningWins >= 5;
                } else if ("MIDNIGHT_WARRIOR".equals(achievement.getCode())) {
                    // Win 5 games between 12AM and 3AM
                    long midnightWins = userGames.stream()
                        .filter(g -> isTimeInRange(g.getPlayedAt(), 0, 3))
                        .count();
                    shouldUnlock = midnightWins >= 5;
                } else if ("LUNCH_BREAK_PRO".equals(achievement.getCode())) {
                    // Win 5 games between 12PM and 2PM
                    long lunchWins = userGames.stream()
                        .filter(g -> isTimeInRange(g.getPlayedAt(), 12, 14))
                        .count();
                    shouldUnlock = lunchWins >= 5;
                } else if ("EVENING_EXPERT".equals(achievement.getCode())) {
                    // Win 5 games between 6PM and 9PM
                    long eveningWins = userGames.stream()
                        .filter(g -> isTimeInRange(g.getPlayedAt(), 18, 21))
                        .count();
                    shouldUnlock = eveningWins >= 5;
                }
            } else if (achievement.getCategory() == AchievementCategory.STREAK) {
                if ("CONSISTENCY_KING".equals(achievement.getCode())) {
                    // Check if user ever had 5+ consecutive wins
                    shouldUnlock = user.getBestWinStreak() != null && user.getBestWinStreak() >= 5;
                } else if ("UNSTOPPABLE_STREAK".equals(achievement.getCode())) {
                    // Win 10 consecutive games
                    shouldUnlock = user.getBestWinStreak() != null && user.getBestWinStreak() >= 10;
                } else if ("COMEBACK_VICTORY".equals(achievement.getCode())) {
                    // Check if there was ever a comeback after 3 losses
                    shouldUnlock = checkForRetroactiveComebackAfterLosses(allGames, 3);
                } else if ("PHOENIX_RISING".equals(achievement.getCode())) {
                    // Check if there was ever a comeback after 5 losses
                    shouldUnlock = checkForRetroactiveComebackAfterLosses(allGames, 5);
                }
            }

            if (shouldUnlock) {
                unlockAchievement(user, achievement);
                newlyUnlocked.add(achievement);
                unlockedIds.add(achievement.getId());
            }
        }

        return newlyUnlocked;
    }

    /**
     * Check difficulty achievements for the current game
     */
    private List<Achievement> checkDifficultyAchievements(User user, Game game, List<Long> unlockedIds) {
        List<Achievement> newlyUnlocked = new ArrayList<>();

        if (!game.getWon()) {
            return newlyUnlocked; // Difficulty achievements only for wins
        }

        List<Achievement> difficultyAchievements = achievementRepository.findByTypeAndActiveTrue(AchievementType.DIFFICULTY);

        for (Achievement achievement : difficultyAchievements) {
            if (unlockedIds.contains(achievement.getId())) {
                continue;
            }

            boolean shouldUnlock = false;

            if ("HARD_MODE_WIN".equals(achievement.getCode())) {
                // Win on hard (difficulty 2)
                shouldUnlock = game.getDifficulty() == 2;
            } else if ("MIXED_MASTER".equals(achievement.getCode())) {
                // Check if won on all difficulties
                Set<Integer> wonDifficulties = gameRepository.findByUserAndWonTrue(user).stream()
                    .map(Game::getDifficulty)
                    .collect(Collectors.toSet());
                shouldUnlock = wonDifficulties.containsAll(Arrays.asList(0, 1, 2));
            } else if ("HARD_MODE_EXPERT".equals(achievement.getCode())) {
                // 10+ wins on hard
                long hardWins = gameRepository.findByUserAndWonTrue(user).stream()
                    .filter(g -> g.getDifficulty() == 2)
                    .count();
                shouldUnlock = hardWins >= 10;
            } else if ("HARD_MODE_MASTER".equals(achievement.getCode())) {
                // 50+ wins on hard
                long hardWins = gameRepository.findByUserAndWonTrue(user).stream()
                    .filter(g -> g.getDifficulty() == 2)
                    .count();
                shouldUnlock = hardWins >= 50;
            } else if ("DIFFICULTY_BALANCED".equals(achievement.getCode())) {
                // 10+ wins on each difficulty
                Map<Integer, Long> winsPerDifficulty = gameRepository.findByUserAndWonTrue(user).stream()
                    .collect(Collectors.groupingBy(Game::getDifficulty, Collectors.counting()));
                shouldUnlock = winsPerDifficulty.getOrDefault(0, 0L) >= 10 &&
                              winsPerDifficulty.getOrDefault(1, 0L) >= 10 &&
                              winsPerDifficulty.getOrDefault(2, 0L) >= 10;
            }

            if (shouldUnlock) {
                unlockAchievement(user, achievement);
                newlyUnlocked.add(achievement);
                unlockedIds.add(achievement.getId());
            }
        }

        return newlyUnlocked;
    }

    /**
     * Check retroactive difficulty achievements (scan all games)
     */
    private List<Achievement> checkRetroactiveDifficultyAchievements(User user, List<Long> unlockedIds) {
        // Difficulty checks are the same for retroactive, so reuse the logic
        // Create a dummy game to trigger checks, but we'll use full history
        List<Achievement> newlyUnlocked = new ArrayList<>();
        List<Achievement> difficultyAchievements = achievementRepository.findByTypeAndActiveTrue(AchievementType.DIFFICULTY);
        List<Game> wonGames = gameRepository.findByUserAndWonTrue(user);

        for (Achievement achievement : difficultyAchievements) {
            if (unlockedIds.contains(achievement.getId())) {
                continue;
            }

            boolean shouldUnlock = false;

            if ("HARD_MODE_WIN".equals(achievement.getCode())) {
                shouldUnlock = wonGames.stream().anyMatch(g -> g.getDifficulty() == 2);
            } else if ("MIXED_MASTER".equals(achievement.getCode())) {
                Set<Integer> wonDifficulties = wonGames.stream()
                    .map(Game::getDifficulty)
                    .collect(Collectors.toSet());
                shouldUnlock = wonDifficulties.containsAll(Arrays.asList(0, 1, 2));
            } else if ("HARD_MODE_EXPERT".equals(achievement.getCode())) {
                long hardWins = wonGames.stream()
                    .filter(g -> g.getDifficulty() == 2)
                    .count();
                shouldUnlock = hardWins >= 10;
            } else if ("HARD_MODE_MASTER".equals(achievement.getCode())) {
                long hardWins = wonGames.stream()
                    .filter(g -> g.getDifficulty() == 2)
                    .count();
                shouldUnlock = hardWins >= 50;
            } else if ("DIFFICULTY_BALANCED".equals(achievement.getCode())) {
                Map<Integer, Long> winsPerDifficulty = wonGames.stream()
                    .collect(Collectors.groupingBy(Game::getDifficulty, Collectors.counting()));
                shouldUnlock = winsPerDifficulty.getOrDefault(0, 0L) >= 10 &&
                              winsPerDifficulty.getOrDefault(1, 0L) >= 10 &&
                              winsPerDifficulty.getOrDefault(2, 0L) >= 10;
            }

            if (shouldUnlock) {
                unlockAchievement(user, achievement);
                newlyUnlocked.add(achievement);
                unlockedIds.add(achievement.getId());
            }
        }

        return newlyUnlocked;
    }

    /**
     * Unlock an achievement for a user
     */
    private void unlockAchievement(User user, Achievement achievement) {
        if (!userAchievementRepository.existsByUserAndAchievement(user, achievement)) {
            UserAchievement ua = new UserAchievement(user, achievement);
            userAchievementRepository.save(ua);
        }
    }

    /**
     * Get unlock dates for user's achievements
     */
    private Map<Long, LocalDateTime> getUserAchievementUnlockDates(User user) {
        List<UserAchievement> userAchievements = userAchievementRepository.findByUserOrderByUnlockedAtDesc(user);
        return userAchievements.stream()
            .collect(Collectors.toMap(
                ua -> ua.getAchievement().getId(),
                UserAchievement::getUnlockedAt
            ));
    }

    /**
     * Parse time string (MM:SS) to seconds
     */
    private int parseTimeToSeconds(String timeTaken) {
        try {
            String[] parts = timeTaken.split(":");
            int minutes = Integer.parseInt(parts[0]);
            int seconds = Integer.parseInt(parts[1]);
            return minutes * 60 + seconds;
        } catch (Exception e) {
            return Integer.MAX_VALUE; // If parsing fails, return max value
        }
    }

    /**
     * Check if a game was played within a specific hour range (24-hour format)
     * @param playedAt The timestamp when the game was played
     * @param startHour Start hour (inclusive, 0-23)
     * @param endHour End hour (exclusive, 0-24)
     */
    private boolean isTimeInRange(LocalDateTime playedAt, int startHour, int endHour) {
        if (playedAt == null) {
            return false;
        }
        int hour = playedAt.getHour();
        return hour >= startHour && hour < endHour;
    }

    /**
     * Check if the most recent N games before this win were all losses
     * Used for comeback achievements (real-time check)
     */
    private boolean checkForComebackAfterLosses(User user, int lossCount) {
        // Get all games sorted by playedAt descending
        List<Game> allGames = gameRepository.findByUser(user).stream()
            .sorted((g1, g2) -> g2.getPlayedAt().compareTo(g1.getPlayedAt()))
            .collect(Collectors.toList());

        // Need at least lossCount + 1 games (N losses + current win)
        if (allGames.size() < lossCount + 1) {
            return false;
        }

        // Check if the most recent game is a win (the game we just played)
        if (!allGames.get(0).getWon()) {
            return false;
        }

        // Check if the previous N games were all losses
        for (int i = 1; i <= lossCount; i++) {
            if (allGames.get(i).getWon()) {
                return false; // Found a win, not a comeback
            }
        }

        return true; // N consecutive losses followed by a win
    }

    /**
     * Check if there was ever a sequence of N losses followed by a win
     * Used for retroactive comeback achievements
     */
    private boolean checkForRetroactiveComebackAfterLosses(List<Game> allGames, int lossCount) {
        if (allGames.size() < lossCount + 1) {
            return false;
        }

        // Sort games by playedAt ascending (oldest first)
        List<Game> sortedGames = allGames.stream()
            .sorted((g1, g2) -> g1.getPlayedAt().compareTo(g2.getPlayedAt()))
            .collect(Collectors.toList());

        // Check for any sequence of N losses followed by a win
        for (int i = 0; i <= sortedGames.size() - lossCount - 1; i++) {
            boolean allLosses = true;

            // Check if next N games are losses
            for (int j = i; j < i + lossCount; j++) {
                if (sortedGames.get(j).getWon()) {
                    allLosses = false;
                    break;
                }
            }

            // If we found N consecutive losses, check if followed by a win
            if (allLosses && i + lossCount < sortedGames.size()) {
                if (sortedGames.get(i + lossCount).getWon()) {
                    return true; // Found a comeback!
                }
            }
        }

        return false;
    }

    /**
     * Check if there's any sequence of N consecutive wins with <=3 attempts
     * Used for PERFECT_TRIFECTA achievement
     */
    private boolean checkForConsecutivePerfectGames(List<Game> wonGames, int consecutiveCount) {
        if (wonGames.size() < consecutiveCount) {
            return false;
        }

        // Sort games by playedAt ascending
        List<Game> sortedGames = wonGames.stream()
            .sorted((g1, g2) -> g1.getPlayedAt().compareTo(g2.getPlayedAt()))
            .collect(Collectors.toList());

        // Check for any sequence of N consecutive perfect games
        for (int i = 0; i <= sortedGames.size() - consecutiveCount; i++) {
            boolean allPerfect = true;

            for (int j = i; j < i + consecutiveCount; j++) {
                if (sortedGames.get(j).getAttempts() > 3) {
                    allPerfect = false;
                    break;
                }
            }

            if (allPerfect) {
                return true; // Found N consecutive perfect games
            }
        }

        return false;
    }
}
