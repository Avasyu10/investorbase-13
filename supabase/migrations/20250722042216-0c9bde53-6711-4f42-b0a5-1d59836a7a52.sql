-- Create an enum for pipeline stages to ensure consistency
CREATE TYPE public.pipeline_stage_enum AS ENUM (
  'pitch_received',
  'initial_review',
  'deck_evaluated', 
  'shortlisted',
  'due_diligence',
  'term_sheet_offer',
  'negotiation',
  'investment_decision',
  'closed_won',
  'closed_lost'
);

-- Add pipeline_stage column to company_details table with proper enum default
ALTER TABLE public.company_details 
ADD COLUMN pipeline_stage pipeline_stage_enum DEFAULT 'pitch_received';