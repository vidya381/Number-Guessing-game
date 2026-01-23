-- Migration script for adding hints system
-- Note: With spring.jpa.hibernate.ddl-auto=update, this will be done automatically.
-- This file is provided for reference or manual execution if needed.

-- Add hints_used column to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS hints_used INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN games.hints_used IS 'Number of hints used during this game';

-- Optional: Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_games_hints_used ON games(hints_used);

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'games' AND column_name = 'hints_used';
