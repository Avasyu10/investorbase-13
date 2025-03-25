
-- Drop the existing policies that are causing issues
DROP POLICY IF EXISTS "Users can view their own email pitch submissions" ON public.email_pitch_submissions;
DROP POLICY IF EXISTS "Users can insert their own email pitch submissions" ON public.email_pitch_submissions;
DROP POLICY IF EXISTS "Users can update their own email pitch submissions" ON public.email_pitch_submissions;

-- Create a more permissive policy for select on email_pitch_submissions
-- This allows authenticated users to see all email pitch submissions
CREATE POLICY "Authenticated users can view all email pitch submissions" 
ON public.email_pitch_submissions
FOR SELECT
TO authenticated;
