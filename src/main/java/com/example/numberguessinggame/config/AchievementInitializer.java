package com.example.numberguessinggame.config;

import com.example.numberguessinggame.entity.Achievement;
import com.example.numberguessinggame.entity.Achievement.AchievementCategory;
import com.example.numberguessinggame.entity.Achievement.AchievementType;
import com.example.numberguessinggame.repository.AchievementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class AchievementInitializer implements ApplicationRunner {

    @Autowired
    private AchievementRepository achievementRepository;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        initializeAchievements();
    }

    private void initializeAchievements() {
        System.out.println("Checking and updating achievements...");

        long initialCount = achievementRepository.count();

        // Create all achievement definitions (will skip if code already exists)
        createMilestoneAchievements();
        createSkillAchievements();
        createDifficultyAchievements();
        createStreakAchievements();
        createSpecialVictoryAchievements();
        createTimeOfDayAchievements();
        createComebackAchievements();
        createEfficiencyAchievements();

        long finalCount = achievementRepository.count();
        long newAchievements = finalCount - initialCount;

        if (newAchievements > 0) {
            System.out.println("Added " + newAchievements + " new achievements!");
        }
        System.out.println("Achievement check complete! Total: " + finalCount);
    }

    private void saveIfNotExists(Achievement achievement) {
        // Check if achievement with this code already exists
        if (!achievementRepository.findByCode(achievement.getCode()).isPresent()) {
            achievementRepository.save(achievement);
        }
    }

    private void createMilestoneAchievements() {
        // Wins milestones
        saveIfNotExists(new Achievement(
            "FIRST_WIN",
            "First Victory",
            "Win your first game",
            AchievementType.MILESTONE,
            AchievementCategory.WINS,
            1,
            "fa-trophy",
            "#FFD700",
            10
        ));

        saveIfNotExists(new Achievement(
            "FIVE_WINS",
            "Winner",
            "Win 5 games",
            AchievementType.MILESTONE,
            AchievementCategory.WINS,
            5,
            "fa-medal",
            "#C0C0C0",
            25
        ));

        saveIfNotExists(new Achievement(
            "TWENTY_WINS",
            "Champion",
            "Win 20 games",
            AchievementType.MILESTONE,
            AchievementCategory.WINS,
            20,
            "fa-crown",
            "#FFD700",
            50
        ));

        saveIfNotExists(new Achievement(
            "FIFTY_WINS",
            "Master",
            "Win 50 games",
            AchievementType.MILESTONE,
            AchievementCategory.WINS,
            50,
            "fa-star",
            "#F39C12",
            100
        ));

        saveIfNotExists(new Achievement(
            "HUNDRED_WINS",
            "Grandmaster",
            "Win 100 games",
            AchievementType.MILESTONE,
            AchievementCategory.WINS,
            100,
            "fa-gem",
            "#9B59B6",
            200
        ));

        // Games played milestones
        saveIfNotExists(new Achievement(
            "GETTING_STARTED",
            "Getting Started",
            "Play 10 games",
            AchievementType.MILESTONE,
            AchievementCategory.GAMES,
            10,
            "fa-play",
            "#27AE60",
            15
        ));

        saveIfNotExists(new Achievement(
            "DEDICATED_PLAYER",
            "Dedicated Player",
            "Play 50 games",
            AchievementType.MILESTONE,
            AchievementCategory.GAMES,
            50,
            "fa-gamepad",
            "#2ECC71",
            50
        ));

        saveIfNotExists(new Achievement(
            "CENTURY_CLUB",
            "Century Club",
            "Play 100 games",
            AchievementType.MILESTONE,
            AchievementCategory.GAMES,
            100,
            "fa-dice",
            "#F39C12",
            100
        ));

        saveIfNotExists(new Achievement(
            "LEGEND",
            "Legend",
            "Play 500 games",
            AchievementType.MILESTONE,
            AchievementCategory.GAMES,
            500,
            "fa-infinity",
            "#E74C3C",
            500
        ));
    }

    private void createSkillAchievements() {
        saveIfNotExists(new Achievement(
            "PERFECT_SCORE",
            "Perfect Score",
            "Win with 3 attempts or less",
            AchievementType.SKILL,
            AchievementCategory.ATTEMPTS,
            3,
            "fa-bullseye",
            "#E74C3C",
            50
        ));

        saveIfNotExists(new Achievement(
            "EFFICIENT_PLAYER",
            "Efficient Player",
            "Win 10 games with 5 or fewer attempts",
            AchievementType.SKILL,
            AchievementCategory.ATTEMPTS,
            5,
            "fa-check-circle",
            "#2ECC71",
            75
        ));

        saveIfNotExists(new Achievement(
            "SPEED_RUNNER",
            "Speed Runner",
            "Win a game in under 2 minutes",
            AchievementType.SKILL,
            AchievementCategory.TIME,
            120,
            "fa-bolt",
            "#F39C12",
            40
        ));

        saveIfNotExists(new Achievement(
            "LIGHTNING_FAST",
            "Lightning Fast",
            "Win a game in under 1 minute",
            AchievementType.SKILL,
            AchievementCategory.TIME,
            60,
            "fa-rocket",
            "#9B59B6",
            75
        ));

        saveIfNotExists(new Achievement(
            "CONSISTENCY_KING",
            "Consistency King",
            "Win 5 consecutive games",
            AchievementType.SKILL,
            AchievementCategory.STREAK,
            5,
            "fa-fire",
            "#E74C3C",
            100
        ));
    }

    private void createDifficultyAchievements() {
        saveIfNotExists(new Achievement(
            "HARD_MODE_WIN",
            "Hard Mode Conqueror",
            "Win on Hard difficulty",
            AchievementType.DIFFICULTY,
            AchievementCategory.DIFFICULTY,
            1,
            "fa-skull",
            "#95A5A6",
            30
        ));

        saveIfNotExists(new Achievement(
            "MIXED_MASTER",
            "Mixed Master",
            "Win at least once on each difficulty",
            AchievementType.DIFFICULTY,
            AchievementCategory.DIFFICULTY,
            3,
            "fa-layer-group",
            "#3498DB",
            50
        ));

        saveIfNotExists(new Achievement(
            "HARD_MODE_EXPERT",
            "Hard Mode Expert",
            "Win 10 games on Hard",
            AchievementType.DIFFICULTY,
            AchievementCategory.DIFFICULTY,
            10,
            "fa-shield",
            "#9B59B6",
            75
        ));

        saveIfNotExists(new Achievement(
            "HARD_MODE_MASTER",
            "Hard Mode Master",
            "Win 50 games on Hard",
            AchievementType.DIFFICULTY,
            AchievementCategory.DIFFICULTY,
            50,
            "fa-dragon",
            "#E74C3C",
            150
        ));

        saveIfNotExists(new Achievement(
            "DIFFICULTY_BALANCED",
            "Difficulty Balanced",
            "Win 10+ games on each difficulty",
            AchievementType.DIFFICULTY,
            AchievementCategory.DIFFICULTY,
            10,
            "fa-balance-scale",
            "#2ECC71",
            100
        ));
    }

    private void createStreakAchievements() {
        // Future streak achievements (not yet implemented in logic)
        // These are created but won't be unlocked until streak tracking is added
    }

    private void createSpecialVictoryAchievements() {
        saveIfNotExists(new Achievement(
            "CLOSE_CALL",
            "Close Call",
            "Win on your 10th (final) attempt",
            AchievementType.SKILL,
            AchievementCategory.ATTEMPTS,
            10,
            "fa-heartbeat",
            "#E74C3C",
            30
        ));

        saveIfNotExists(new Achievement(
            "EARLY_BIRD_VICTORY",
            "Early Bird",
            "Win within your first 3 attempts",
            AchievementType.SKILL,
            AchievementCategory.ATTEMPTS,
            3,
            "fa-sun",
            "#F39C12",
            40
        ));

        saveIfNotExists(new Achievement(
            "LUCKY_SEVEN",
            "Lucky Seven",
            "Win on exactly your 7th attempt",
            AchievementType.SKILL,
            AchievementCategory.ATTEMPTS,
            7,
            "fa-clover",
            "#2ECC71",
            25
        ));

        saveIfNotExists(new Achievement(
            "INSTANT_WIN",
            "Instant Victory",
            "Win a game in under 30 seconds",
            AchievementType.SKILL,
            AchievementCategory.TIME,
            30,
            "fa-bolt",
            "#FFD700",
            100
        ));

        saveIfNotExists(new Achievement(
            "TIME_ATTACK_MASTER",
            "Time Attack Master",
            "Win 10 games in under 2 minutes each",
            AchievementType.SKILL,
            AchievementCategory.TIME,
            120,
            "fa-stopwatch",
            "#9B59B6",
            150
        ));
    }

    private void createTimeOfDayAchievements() {
        saveIfNotExists(new Achievement(
            "MORNING_GLORY",
            "Morning Glory",
            "Win 5 games between 6AM and 9AM",
            AchievementType.SKILL,
            AchievementCategory.TIME,
            5,
            "fa-coffee",
            "#F39C12",
            50
        ));

        saveIfNotExists(new Achievement(
            "MIDNIGHT_WARRIOR",
            "Midnight Warrior",
            "Win 5 games between 12AM and 3AM",
            AchievementType.SKILL,
            AchievementCategory.TIME,
            5,
            "fa-moon",
            "#9B59B6",
            50
        ));

        saveIfNotExists(new Achievement(
            "LUNCH_BREAK_PRO",
            "Lunch Break Pro",
            "Win 5 games between 12PM and 2PM",
            AchievementType.SKILL,
            AchievementCategory.TIME,
            5,
            "fa-utensils",
            "#E67E22",
            35
        ));

        saveIfNotExists(new Achievement(
            "EVENING_EXPERT",
            "Evening Expert",
            "Win 5 games between 6PM and 9PM",
            AchievementType.SKILL,
            AchievementCategory.TIME,
            5,
            "fa-cloud-sun",
            "#E67E22",
            35
        ));
    }

    private void createComebackAchievements() {
        saveIfNotExists(new Achievement(
            "COMEBACK_VICTORY",
            "Comeback Victory",
            "Win after losing 3 games in a row",
            AchievementType.SKILL,
            AchievementCategory.STREAK,
            3,
            "fa-redo",
            "#2ECC71",
            40
        ));

        saveIfNotExists(new Achievement(
            "PHOENIX_RISING",
            "Phoenix Rising",
            "Win after losing 5 games in a row",
            AchievementType.SKILL,
            AchievementCategory.STREAK,
            5,
            "fa-dragon",
            "#E74C3C",
            75
        ));

        saveIfNotExists(new Achievement(
            "UNSTOPPABLE_STREAK",
            "Unstoppable Streak",
            "Win 10 consecutive games",
            AchievementType.SKILL,
            AchievementCategory.STREAK,
            10,
            "fa-fire-flame-curved",
            "#FFD700",
            150
        ));
    }

    private void createEfficiencyAchievements() {
        saveIfNotExists(new Achievement(
            "MIRACLE_GUESS",
            "Miracle Guess",
            "Win on your first attempt (extremely rare!)",
            AchievementType.SKILL,
            AchievementCategory.ATTEMPTS,
            1,
            "fa-magic",
            "#FFD700",
            500
        ));

        saveIfNotExists(new Achievement(
            "TWO_GUESS_WONDER",
            "Two Guess Wonder",
            "Win in exactly 2 attempts",
            AchievementType.SKILL,
            AchievementCategory.ATTEMPTS,
            2,
            "fa-star",
            "#9B59B6",
            200
        ));

        saveIfNotExists(new Achievement(
            "PERFECT_TRIFECTA",
            "Perfect Trifecta",
            "Win 3 consecutive perfect games (3 or fewer attempts)",
            AchievementType.SKILL,
            AchievementCategory.ATTEMPTS,
            3,
            "fa-crown",
            "#FFD700",
            200
        ));
    }
}
