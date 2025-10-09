-- Migration: create submission_evaluations table
CREATE TABLE IF NOT EXISTS public.submission_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_submission_id UUID REFERENCES public.startup_submissions(id) ON DELETE CASCADE,
    startup_name TEXT,
    problem_statement TEXT,
    evaluator_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Problem
    existence_score INTEGER CHECK (
        existence_score >= 1
        AND existence_score <= 20
    ),
    severity_score INTEGER CHECK (
        severity_score >= 1
        AND severity_score <= 20
    ),
    frequency_score INTEGER CHECK (
        frequency_score >= 1
        AND frequency_score <= 20
    ),
    unmet_need_score INTEGER CHECK (
        unmet_need_score >= 1
        AND unmet_need_score <= 20
    ),
    -- Solution
    direct_fit_score INTEGER,
    differentiation_score INTEGER,
    feasibility_score INTEGER,
    effectiveness_score INTEGER,
    -- Market
    market_size_score INTEGER,
    growth_trajectory_score INTEGER,
    timing_readiness_score INTEGER,
    external_catalysts_score INTEGER,
    -- Customers
    first_customers_score INTEGER,
    accessibility_score INTEGER,
    acquisition_approach_score INTEGER,
    pain_recognition_score INTEGER,
    -- Competition
    direct_competitors_score INTEGER,
    substitutes_score INTEGER,
    differentiation_vs_players_score INTEGER,
    dynamics_score INTEGER,
    -- USP
    usp_clarity_score INTEGER,
    usp_differentiation_strength_score INTEGER,
    usp_defensibility_score INTEGER,
    usp_alignment_score INTEGER,
    -- Tech
    tech_vision_ambition_score INTEGER,
    tech_coherence_score INTEGER,
    tech_alignment_score INTEGER,
    tech_realism_score INTEGER,
    tech_feasibility_score INTEGER,
    tech_components_score INTEGER,
    tech_complexity_awareness_score INTEGER,
    tech_roadmap_score INTEGER,
    overall_average NUMERIC(5, 2),
    ai_analysis_summary TEXT,
    ai_recommendations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE public.submission_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select submission evaluations" ON public.submission_evaluations FOR
SELECT TO authenticated USING (true);
CREATE INDEX idx_submission_evaluations_submission ON public.submission_evaluations(startup_submission_id);
CREATE INDEX idx_submission_evaluations_created ON public.submission_evaluations(created_at DESC);