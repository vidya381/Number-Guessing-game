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
        // Check if achievements already exist
        if (achievementRepository.count() > 0) {
            System.out.println("Achievements already initialized. Skipping...");
            return;
        }

        System.out.println("Initializing achievements...");

        // Create all achievement definitions
        createMilestoneAchievements();
        createSkillAchievements();
        createDifficultyAchievements();
        createStreakAchievements();

        System.out.println("Achievement initialization complete! Total: " + achievementRepository.count());
    }

    private void createMilestoneAchievements() {
        // Wins milestones
        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
            "FIFTY_WINS",
            "Master",
            "Win 50 games",
            AchievementType.MILESTONE,
            AchievementCategory.WINS,
            50,
            "fa-star",
            "#9B59B6",
            100
        ));

        achievementRepository.save(new Achievement(
            "HUNDRED_WINS",
            "Grandmaster",
            "Win 100 games",
            AchievementType.MILESTONE,
            AchievementCategory.WINS,
            100,
            "fa-gem",
            "#E74C3C",
            200
        ));

        // Games played milestones
        achievementRepository.save(new Achievement(
            "GETTING_STARTED",
            "Getting Started",
            "Play 10 games",
            AchievementType.MILESTONE,
            AchievementCategory.GAMES,
            10,
            "fa-play",
            "#3498DB",
            15
        ));

        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
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
        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
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
        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
            "HARD_MODE_EXPERT",
            "Hard Mode Expert",
            "Win 10 games on Hard",
            AchievementType.DIFFICULTY,
            AchievementCategory.DIFFICULTY,
            10,
            "fa-shield-alt",
            "#9B59B6",
            75
        ));

        achievementRepository.save(new Achievement(
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

        achievementRepository.save(new Achievement(
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
}
