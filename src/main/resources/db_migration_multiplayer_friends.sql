-- Database migration for Friends System and Multiplayer Mode
-- This migration creates tables for friends, friend requests, multiplayer challenges, and game sessions

-- ============================================================
-- PHASE 1: Friends System Tables
-- ============================================================

-- Table: friendships
-- Stores bidirectional friendship relationships between users
CREATE TABLE IF NOT EXISTS friendships (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
    CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

-- Indexes for friendship lookups
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);

-- Table: friend_requests
-- Tracks friend requests between users with status
CREATE TABLE IF NOT EXISTS friend_requests (
    id BIGSERIAL PRIMARY KEY,
    from_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_friend_request UNIQUE (from_user_id, to_user_id),
    CONSTRAINT no_self_request CHECK (from_user_id != to_user_id),
    CONSTRAINT valid_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED'))
);

-- Indexes for friend request lookups
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- ============================================================
-- PHASE 3: Multiplayer Challenge Tables
-- ============================================================

-- Table: multiplayer_challenges
-- Tracks challenge invitations between friends
CREATE TABLE IF NOT EXISTS multiplayer_challenges (
    id BIGSERIAL PRIMARY KEY,
    challenger_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenged_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    difficulty INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_difficulty CHECK (difficulty IN (0, 1, 2)),
    CONSTRAINT valid_challenge_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED'))
);

-- Indexes for challenge lookups
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON multiplayer_challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON multiplayer_challenges(challenged_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON multiplayer_challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON multiplayer_challenges(expires_at);

-- ============================================================
-- PHASE 4: Multiplayer Game Session Tables
-- ============================================================

-- Table: multiplayer_game_sessions
-- Stores active and completed multiplayer game sessions
CREATE TABLE IF NOT EXISTS multiplayer_game_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    player1_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player2_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    difficulty INTEGER NOT NULL,
    digit_count INTEGER NOT NULL,
    secret_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    winner_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT valid_session_difficulty CHECK (difficulty IN (0, 1, 2)),
    CONSTRAINT valid_session_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
    CONSTRAINT valid_digit_count CHECK (digit_count >= 3 AND digit_count <= 6)
);

-- Indexes for game session lookups
CREATE INDEX IF NOT EXISTS idx_game_sessions_session_id ON multiplayer_game_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player1 ON multiplayer_game_sessions(player1_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player2 ON multiplayer_game_sessions(player2_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON multiplayer_game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_winner ON multiplayer_game_sessions(winner_id);

-- Table: multiplayer_player_progress
-- Tracks individual player progress within a game session
CREATE TABLE IF NOT EXISTS multiplayer_player_progress (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES multiplayer_game_sessions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    solved BOOLEAN NOT NULL DEFAULT FALSE,
    solved_at TIMESTAMP,
    connected BOOLEAN NOT NULL DEFAULT TRUE,
    last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_user UNIQUE (session_id, user_id)
);

-- Indexes for player progress lookups
CREATE INDEX IF NOT EXISTS idx_player_progress_session ON multiplayer_player_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_player_progress_user ON multiplayer_player_progress(user_id);

-- ============================================================
-- Migration Complete
-- ============================================================

-- To apply this migration to your Supabase database:
-- 1. Connect to your database using psql or Supabase SQL Editor
-- 2. Run this entire SQL file
-- 3. Verify tables were created: \dt multiplayer* friend*
-- 4. Verify indexes were created: \di idx_*

-- Notes:
-- - All tables use ON DELETE CASCADE to maintain referential integrity
-- - Indexes are created for all foreign keys and frequently queried columns
-- - Status fields have CHECK constraints to ensure data validity
-- - Timestamps use DEFAULT CURRENT_TIMESTAMP for automatic timestamping
