
-- Drop all existing policies for report_pdfs bucket
DROP POLICY IF EXISTS "Allow authenticated upload to report_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow reading report_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow updating own report_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow deleting own report_pdfs" ON storage.objects;

-- Create comprehensive policies for report_pdfs bucket
CREATE POLICY "Authenticated users can upload to report_pdfs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'report_pdfs' 
  AND auth.role() = 'authenticated'
);

-- Allow reading PDFs with multiple access patterns
CREATE POLICY "Users can read report_pdfs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'report_pdfs' 
  AND (
    -- Direct file access (for public submissions)
    true
    OR
    -- User-specific folder access
    auth.uid()::text = split_part(name, '/', 1)
    OR
    -- Report owner access
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE (r.pdf_url = name OR r.pdf_url = split_part(name, '/', 2))
      AND (r.user_id = auth.uid() OR r.is_public_submission = true)
    )
    OR
    -- Admin access
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  )
);

-- Allow updating files
CREATE POLICY "Users can update report_pdfs" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'report_pdfs' 
  AND (
    auth.uid()::text = split_part(name, '/', 1)
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  )
);

-- Allow deleting files
CREATE POLICY "Users can delete report_pdfs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'report_pdfs' 
  AND (
    auth.uid()::text = split_part(name, '/', 1)
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  )
);

-- Ensure the bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('report_pdfs', 'report_pdfs', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];
