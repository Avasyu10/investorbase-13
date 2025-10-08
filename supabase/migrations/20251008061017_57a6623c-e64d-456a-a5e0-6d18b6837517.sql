-- Update RLS policies to allow public submissions
DROP POLICY IF EXISTS "Users can insert their own startup submissions" ON public.startup_submissions;

-- Allow anyone to insert startup submissions (both authenticated and anonymous)
CREATE POLICY "Anyone can submit startup details"
ON public.startup_submissions
FOR INSERT
TO public
WITH CHECK (true);

-- Update select policy to allow users to view their own submissions OR admin access
DROP POLICY IF EXISTS "Users can view their own startup submissions" ON public.startup_submissions;

CREATE POLICY "Users can view their own startup submissions"
ON public.startup_submissions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Update storage policies to allow anonymous uploads
DROP POLICY IF EXISTS "Users can upload their own startup files" ON storage.objects;

CREATE POLICY "Anyone can upload startup files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'startup-files');