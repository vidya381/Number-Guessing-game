package com.example.numberguessinggame.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Database migration to fix NULL streak values for existing users
 */
@Component
public class DatabaseMigration {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void migrateStreakValues() {
        try {
            // Fix NULL streak values for existing users
            jdbcTemplate.execute("UPDATE users SET current_win_streak = 0 WHERE current_win_streak IS NULL");
            jdbcTemplate.execute("UPDATE users SET best_win_streak = 0 WHERE best_win_streak IS NULL");
            jdbcTemplate.execute("UPDATE users SET consecutive_play_days = 0 WHERE consecutive_play_days IS NULL");
            jdbcTemplate.execute("UPDATE users SET best_play_day_streak = 0 WHERE best_play_day_streak IS NULL");

            System.out.println("✓ Database migration completed: NULL streak values set to 0");
        } catch (Exception e) {
            System.err.println("Database migration warning: " + e.getMessage());
            // Don't fail startup if migration fails
        }
    }
}
