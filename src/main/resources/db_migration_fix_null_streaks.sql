-- Fix NULL streak values for existing users
UPDATE users 
SET current_win_streak = 0 
WHERE current_win_streak IS NULL;

UPDATE users 
SET best_win_streak = 0 
WHERE best_win_streak IS NULL;

UPDATE users 
SET consecutive_play_days = 0 
WHERE consecutive_play_days IS NULL;

UPDATE users 
SET best_play_day_streak = 0 
WHERE best_play_day_streak IS NULL;
