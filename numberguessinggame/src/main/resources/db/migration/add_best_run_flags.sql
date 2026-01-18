-- Migration: Add is_best_run flag to improve leaderboard query performance
-- This eliminates the need for complex nested subqueries

-- Add is_best_run column to survival_session table
ALTER TABLE survival_session ADD COLUMN IF NOT EXISTS is_best_run BOOLEAN DEFAULT FALSE;

-- Add is_best_run column to time_attack_session table
ALTER TABLE time_attack_session ADD COLUMN IF NOT EXISTS is_best_run BOOLEAN DEFAULT FALSE;

-- Create indexes for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_survival_best_run
ON survival_session(difficulty, is_best_run, completed DESC, rounds_survived DESC, total_attempts_used ASC)
WHERE is_best_run = true;

CREATE INDEX IF NOT EXISTS idx_time_attack_best_run
ON time_attack_session(difficulty, is_best_run, total_score DESC, games_won DESC, average_attempts ASC)
WHERE is_best_run = true;

-- Set initial best runs for Survival Mode
-- For each user-difficulty combination, mark the best session
WITH RankedSurvival AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, difficulty
               ORDER BY completed DESC, rounds_survived DESC, total_attempts_used ASC, id ASC
           ) as rank
    FROM survival_session
    WHERE user_id IS NOT NULL
)
UPDATE survival_session
SET is_best_run = true
WHERE id IN (SELECT id FROM RankedSurvival WHERE rank = 1);

-- Set initial best runs for Time Attack Mode
-- For each user-difficulty combination, mark the best session
WITH RankedTimeAttack AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, difficulty
               ORDER BY total_score DESC, games_won DESC, average_attempts ASC, id ASC
           ) as rank
    FROM time_attack_session
    WHERE user_id IS NOT NULL
)
UPDATE time_attack_session
SET is_best_run = true
WHERE id IN (SELECT id FROM RankedTimeAttack WHERE rank = 1);
