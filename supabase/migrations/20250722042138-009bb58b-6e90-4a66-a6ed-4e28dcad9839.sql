-- Add pipeline_stage column to company_details table
ALTER TABLE public.company_details 
ADD COLUMN pipeline_stage text DEFAULT 'pitch_received';

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

-- Update the column to use the enum
ALTER TABLE public.company_details 
ALTER COLUMN pipeline_stage TYPE pipeline_stage_enum 
USING pipeline_stage::pipeline_stage_enum;