-- Migration: Aggressively fix tasks status constraint
-- Description: Drop ALL check constraints on tasks table and re-add only the correct ones

-- Drop all check constraints on the tasks table
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'tasks'::regclass 
        AND contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    END LOOP;
END $$;

-- Add back the correct constraints
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed'));

ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('low', 'medium', 'high'));
