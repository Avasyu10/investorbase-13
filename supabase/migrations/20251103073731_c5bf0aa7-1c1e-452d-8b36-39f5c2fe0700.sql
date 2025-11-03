-- Allow authenticated users to view startup submissions with null user_id (API submissions)
CREATE POLICY "Users can view API submissions with null user_id"
ON public.startup_submissions
FOR SELECT
TO authenticated
USING (user_id IS NULL);