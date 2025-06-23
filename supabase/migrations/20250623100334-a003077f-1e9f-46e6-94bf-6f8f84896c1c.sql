
-- Create the report-pdfs storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-pdfs', 'report-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Allow authenticated upload to report_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow reading report_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow updating own report_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow deleting own report_pdfs" ON storage.objects;

-- Create comprehensive policies for report-pdfs bucket
CREATE POLICY "Allow authenticated users to upload to report-pdfs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'report-pdfs' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow reading from report-pdfs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'report-pdfs' 
  AND (
    -- Public access for public submissions
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.pdf_url = name 
      AND r.is_public_submission = true
    )
    OR
    -- User owns the report
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.pdf_url = name 
      AND r.user_id = auth.uid()
    )
    OR
    -- User-specific folder access
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Admin access
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  )
);

CREATE POLICY "Allow updating own files in report-pdfs" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'report-pdfs' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  )
);

CREATE POLICY "Allow deleting own files in report-pdfs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'report-pdfs' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  )
);
