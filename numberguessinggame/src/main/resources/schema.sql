-- =====================================================
-- NumVana - Complete Database Schema (PostgreSQL)
-- =====================================================
-- This file represents the COMPLETE current database schema
-- For incremental migrations, see db_migration_*.sql files
-- Last Updated: January 2026
-- =====================================================

-- =====================================================
-- TABLE: users
-- Core user accounts and statistics
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    best_score INTEGER,
    total_games INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    current_win_streak INTEGER DEFAULT 0,
    best_win_streak INTEGER DEFAULT 0,
    last_played_date DATE,
    consecutive_play_days INTEGER DEFAULT 0,
    best_play_day_streak INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_played_date ON users(last_played_date);

-- Comments for users
COMMENT ON TABLE users IS 'Core user accounts with statistics and streak tracking';
COMMENT ON COLUMN users.best_score IS 'Lowest number of attempts to win a game';
COMMENT ON COLUMN users.current_win_streak IS 'Current consecutive game wins';
COMMENT ON COLUMN users.best_win_streak IS 'Best streak of consecutive wins';
COMMENT ON COLUMN users.consecutive_play_days IS 'Current consecutive days played';
COMMENT ON COLUMN users.best_play_day_streak IS 'Best streak of consecutive play days';
COMMENT ON COLUMN users.coins IS 'Virtual currency earned from game modes';

-- =====================================================
-- TABLE: games
-- Regular game mode history
-- =====================================================
CREATE TABLE IF NOT EXISTS games (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    difficulty INTEGER NOT NULL,
    target_number INTEGER NOT NULL,
    attempts INTEGER NOT NULL,
    won BOOLEAN NOT NULL,
    time_taken VARCHAR(20),
    hints_used INTEGER DEFAULT 0,
    played_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_games_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for games
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_difficulty ON games(difficulty);
CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_won ON games(won);
CREATE INDEX IF NOT EXISTS idx_games_hints_used ON games(hints_used);

-- Comments for games
COMMENT ON TABLE games IS 'Regular game mode play history';
COMMENT ON COLUMN games.difficulty IS 'Difficulty level: 0=Easy, 1=Medium, 2=Hard';
COMMENT ON COLUMN games.hints_used IS 'Number of hints used during this game';

-- =====================================================
-- TABLE: achievements
-- Achievement definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS achievements (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    type VARCHAR(20) NOT NULL,
    category VARCHAR(20) NOT NULL,
    threshold_value INTEGER,
    icon_class VARCHAR(50),
    icon_color VARCHAR(20),
    points INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for achievements
CREATE INDEX IF NOT EXISTS idx_achievements_code ON achievements(code);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(active);

-- Comments for achievements
COMMENT ON TABLE achievements IS 'Achievement definitions and metadata';
COMMENT ON COLUMN achievements.code IS 'Unique identifier code for the achievement';
COMMENT ON COLUMN achievements.type IS 'MILESTONE, SKILL, DIFFICULTY, or STREAK';
COMMENT ON COLUMN achievements.category IS 'GAMES, WINS, ATTEMPTS, TIME, DIFFICULTY, or STREAK';
COMMENT ON COLUMN achievements.threshold_value IS 'Value required to unlock (e.g., 10 wins)';
COMMENT ON COLUMN achievements.points IS 'Point value for completing this achievement';

-- =====================================================
-- TABLE: user_achievements
-- User-earned achievements
-- =====================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    achievement_id BIGINT NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    progress_value INTEGER,
    notified BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_achievement UNIQUE (user_id, achievement_id)
);

-- Indexes for user_achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_notified ON user_achievements(notified);

-- Comments for user_achievements
COMMENT ON TABLE user_achievements IS 'Tracks which achievements users have unlocked';
COMMENT ON COLUMN user_achievements.progress_value IS 'User progress value when achievement was unlocked';
COMMENT ON COLUMN user_achievements.notified IS 'Whether user has been shown the notification';

-- =====================================================
-- TABLE: daily_challenges
-- Daily challenge definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_challenges (
    id BIGSERIAL PRIMARY KEY,
    challenge_date DATE UNIQUE NOT NULL,
    target_number INTEGER NOT NULL,
    difficulty INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for daily_challenges
CREATE INDEX IF NOT EXISTS idx_daily_challenges_challenge_date ON daily_challenges(challenge_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_difficulty ON daily_challenges(difficulty);

-- Comments for daily_challenges
COMMENT ON TABLE daily_challenges IS 'Daily challenge target numbers, one per day';
COMMENT ON COLUMN daily_challenges.difficulty IS 'Difficulty level: 0=Easy(3 digits), 1=Medium(4 digits), 2=Hard(5 digits)';

-- =====================================================
-- TABLE: daily_challenge_attempts
-- User attempts at daily challenges
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_challenge_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    challenge_id BIGINT NOT NULL,
    attempts INTEGER NOT NULL,
    won BOOLEAN NOT NULL,
    time_taken_seconds INTEGER NOT NULL,
    time_display VARCHAR(20),
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_daily_challenge_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_daily_challenge_attempts_challenge FOREIGN KEY (challenge_id) REFERENCES daily_challenges(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_challenge UNIQUE (user_id, challenge_id)
);

-- Indexes for daily_challenge_attempts
CREATE INDEX IF NOT EXISTS idx_daily_challenge_attempts_user_id ON daily_challenge_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_attempts_challenge_id ON daily_challenge_attempts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_attempts_completed_at ON daily_challenge_attempts(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_attempts_won ON daily_challenge_attempts(won);

-- Composite index for leaderboards (won DESC, attempts ASC, time_taken_seconds ASC)
CREATE INDEX IF NOT EXISTS idx_daily_challenge_attempts_leaderboard
ON daily_challenge_attempts(challenge_id, won DESC, attempts ASC, time_taken_seconds ASC);

-- Comments for daily_challenge_attempts
COMMENT ON TABLE daily_challenge_attempts IS 'User attempts at daily challenges, one per user per day';
COMMENT ON COLUMN daily_challenge_attempts.time_taken_seconds IS 'Time in seconds for easier sorting';
COMMENT ON COLUMN daily_challenge_attempts.time_display IS 'Formatted time (MM:SS) for UI display';

-- =====================================================
-- TABLE: time_attack_sessions
-- Time Attack mode sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS time_attack_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    difficulty INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    games_won INTEGER NOT NULL,
    games_played INTEGER NOT NULL,
    session_time_seconds INTEGER NOT NULL DEFAULT 300,
    average_attempts DOUBLE PRECISION,
    fastest_win_seconds INTEGER,
    played_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    game_details TEXT,
    CONSTRAINT fk_time_attack_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for time_attack_sessions
CREATE INDEX IF NOT EXISTS idx_time_attack_sessions_user_id ON time_attack_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_time_attack_sessions_difficulty ON time_attack_sessions(difficulty);
CREATE INDEX IF NOT EXISTS idx_time_attack_sessions_played_at ON time_attack_sessions(played_at DESC);

-- Composite index for leaderboards (total_score DESC, games_won DESC, average_attempts ASC)
CREATE INDEX IF NOT EXISTS idx_time_attack_sessions_leaderboard
ON time_attack_sessions(difficulty, total_score DESC, games_won DESC, average_attempts ASC);

-- Comments for time_attack_sessions
COMMENT ON TABLE time_attack_sessions IS 'Time Attack mode sessions (5 minutes, unlimited games)';
COMMENT ON COLUMN time_attack_sessions.user_id IS 'Nullable - guests can play Time Attack mode';
COMMENT ON COLUMN time_attack_sessions.difficulty IS 'Difficulty level: 0=Easy(3 digits), 1=Medium(4 digits), 2=Hard(5 digits)';
COMMENT ON COLUMN time_attack_sessions.session_time_seconds IS 'Always 300 seconds (5 minutes)';
COMMENT ON COLUMN time_attack_sessions.game_details IS 'JSON array of individual game results';

-- =====================================================
-- TABLE: survival_sessions
-- Survival Mode sessions
-- =====================================================
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

-- Indexes for survival_sessions
CREATE INDEX IF NOT EXISTS idx_survival_sessions_user_id ON survival_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_survival_sessions_difficulty ON survival_sessions(difficulty);
CREATE INDEX IF NOT EXISTS idx_survival_sessions_completed ON survival_sessions(completed);
CREATE INDEX IF NOT EXISTS idx_survival_sessions_completed_at ON survival_sessions(completed_at DESC);

-- Composite index for leaderboards (completed DESC, rounds_survived DESC, total_attempts_used ASC)
CREATE INDEX IF NOT EXISTS idx_survival_sessions_leaderboard
ON survival_sessions(difficulty, completed DESC, rounds_survived DESC, total_attempts_used ASC);

-- Comments for survival_sessions
COMMENT ON TABLE survival_sessions IS 'Survival Mode game sessions (5 rounds, single life)';
COMMENT ON COLUMN survival_sessions.user_id IS 'Foreign key to users table (required - authenticated only)';
COMMENT ON COLUMN survival_sessions.difficulty IS 'Difficulty level: 0=Easy, 1=Medium, 2=Hard';
COMMENT ON COLUMN survival_sessions.rounds_survived IS 'Number of rounds survived (0-5)';
COMMENT ON COLUMN survival_sessions.total_attempts_used IS 'Total attempts used across all rounds';
COMMENT ON COLUMN survival_sessions.completed IS 'True if all 5 rounds were completed';
COMMENT ON COLUMN survival_sessions.coins_earned IS 'Total coins earned from this session';
COMMENT ON COLUMN survival_sessions.started_at IS 'When the survival session was started';
COMMENT ON COLUMN survival_sessions.completed_at IS 'When the survival session was completed/ended';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
