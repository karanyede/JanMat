-- Add views column to news table
-- This migration adds the missing views column to track how many times each news article has been viewed

-- Add the views column with default value 0
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0 NOT NULL;

-- Update existing news records to have 0 views if any exist
UPDATE public.news 
SET views = 0 
WHERE views IS NULL;

-- Verify the column was added successfully
-- You can run this query to check: SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'views';