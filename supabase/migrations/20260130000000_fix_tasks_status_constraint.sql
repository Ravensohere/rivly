-- Migration: Fix tasks status check constraint
-- Description: The tasks table seems to have an old constraint that rejects 'pending'. 
--              We will standardize it to allow 'pending', 'in_progress', 'completed'.

-- 1. Migrate any existing 'todo' status to 'pending' to ensure data integrity
UPDATE tasks SET status = 'pending' WHERE status = 'todo';

-- 2. Drop the existing constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- 3. Add the correct constraint
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed'));
