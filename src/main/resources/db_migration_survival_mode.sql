-- Migration script for adding Survival Mode
-- Execute this script manually on your database to create the survival_sessions table

-- Create survival_sessions table
CREATE TABLE IF NOT EXISTS survival_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    difficulty INTEGER NOT NULL,
    rounds_survived INTEGER NOT NULL,
    total_attempts_used INTEGER NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    coins_earned INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_survival_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_survival_sessions_user_id ON survival_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_survival_sessions_difficulty ON survival_sessions(difficulty);
CREATE INDEX IF NOT EXISTS idx_survival_sessions_completed ON survival_sessions(completed);
CREATE INDEX IF NOT EXISTS idx_survival_sessions_completed_at ON survival_sessions(completed_at DESC);

-- Composite index for leaderboard queries (completed DESC, rounds_survived DESC, total_attempts_used ASC)
CREATE INDEX IF NOT EXISTS idx_survival_sessions_leaderboard
ON survival_sessions(difficulty, completed DESC, rounds_survived DESC, total_attempts_used ASC);

-- Add comments for documentation
COMMENT ON TABLE survival_sessions IS 'Tracks completed Survival Mode game sessions';
COMMENT ON COLUMN survival_sessions.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN survival_sessions.difficulty IS 'Difficulty level: 0=Easy, 1=Medium, 2=Hard';
COMMENT ON COLUMN survival_sessions.rounds_survived IS 'Number of rounds survived (0-5)';
COMMENT ON COLUMN survival_sessions.total_attempts_used IS 'Total attempts used across all rounds';
COMMENT ON COLUMN survival_sessions.completed IS 'True if all 5 rounds were completed';
COMMENT ON COLUMN survival_sessions.coins_earned IS 'Total coins earned from this session';
COMMENT ON COLUMN survival_sessions.started_at IS 'When the survival session was started';
COMMENT ON COLUMN survival_sessions.completed_at IS 'When the survival session was completed/ended';

-- Verify the table was created
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'survival_sessions'
ORDER BY ordinal_position;
