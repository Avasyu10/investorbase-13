-- Add unique constraint to startup_market_research table
-- This allows upsert operations based on startup_submission_id

ALTER TABLE public.startup_market_research 
ADD CONSTRAINT startup_market_research_startup_submission_id_key 
UNIQUE (startup_submission_id);