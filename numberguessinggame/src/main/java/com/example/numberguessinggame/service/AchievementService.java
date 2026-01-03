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
                }
            } else if (achievement.getCategory() == AchievementCategory.TIME) {
                // Check time-based achievements
                if (game.getTimeTaken() != null) {
                    int timeInSeconds = parseTimeToSeconds(game.getTimeTaken());
                    if ("SPEED_RUNNER".equals(achievement.getCode())) {
                        shouldUnlock = timeInSeconds < 120; // Under 2 minutes
                    } else if ("LIGHTNING_FAST".equals(achievement.getCode())) {
                        shouldUnlock = timeInSeconds < 60; // Under 1 minute
                    }
                }
            } else if (achievement.getCategory() == AchievementCategory.STREAK) {
                // Check streak achievements
                if ("CONSISTENCY_KING".equals(achievement.getCode())) {
                    // Check if user has 5+ consecutive wins
                    shouldUnlock = user.getCurrentWinStreak() >= 5;
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
            System.out.println("Achievement unlocked: user=" + user.getUsername() +
                             ", achievement=" + achievement.getName() +
                             ", code=" + achievement.getCode());
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
}
