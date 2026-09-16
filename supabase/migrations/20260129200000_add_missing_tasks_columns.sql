-- Migration: Add missing columns to tasks table
-- Description: Adds linked_block_id, tag, and reminder columns to support frontend requirements

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_block_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tag TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder TEXT;

-- Create index for linked_block_id as it will likely be queried
CREATE INDEX IF NOT EXISTS tasks_linked_block_id_idx ON tasks(linked_block_id);
