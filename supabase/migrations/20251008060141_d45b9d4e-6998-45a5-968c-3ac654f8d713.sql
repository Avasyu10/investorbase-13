-- Create table for startup submissions
CREATE TABLE IF NOT EXISTS public.startup_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- User reference
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Form fields
  problem_statement TEXT NOT NULL,
  solution TEXT NOT NULL,
  market_understanding TEXT NOT NULL,
  customer_understanding TEXT NOT NULL,
  competitive_understanding TEXT NOT NULL,
  unique_selling_proposition TEXT NOT NULL,
  technical_understanding TEXT NOT NULL,
  vision TEXT NOT NULL,
  campus_affiliation BOOLEAN NOT NULL DEFAULT false,
  
  -- Additional details
  startup_name TEXT NOT NULL,
  founder_email TEXT NOT NULL,
  linkedin_profile_url TEXT,
  
  -- File uploads
  pdf_file_url TEXT,
  ppt_file_url TEXT
);

-- Enable RLS
ALTER TABLE public.startup_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own submissions
CREATE POLICY "Users can insert their own startup submissions"
ON public.startup_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own submissions
CREATE POLICY "Users can view their own startup submissions"
ON public.startup_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own submissions
CREATE POLICY "Users can update their own startup submissions"
ON public.startup_submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own submissions
CREATE POLICY "Users can delete their own startup submissions"
ON public.startup_submissions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create storage bucket for startup files
INSERT INTO storage.buckets (id, name, public)
VALUES ('startup-files', 'startup-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for startup files
CREATE POLICY "Users can upload their own startup files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'startup-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view startup files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'startup-files');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_startup_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_startup_submissions_updated_at
BEFORE UPDATE ON public.startup_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_startup_submissions_updated_at();