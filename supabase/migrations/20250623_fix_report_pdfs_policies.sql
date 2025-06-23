
-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Authenticated users can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read accessible PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own PDFs" ON storage.objects;

-- Create simpler, more permissive policies for report_pdfs bucket
CREATE POLICY "Allow authenticated upload to report_pdfs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'report_pdfs' 
  AND auth.role() = 'authenticated'
);

-- Allow reading PDFs with multiple access patterns
CREATE POLICY "Allow reading report_pdfs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'report_pdfs' 
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

-- Allow updating own files
CREATE POLICY "Allow updating own report_pdfs" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'report_pdfs' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  )
);

-- Allow deleting own files
CREATE POLICY "Allow deleting own report_pdfs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'report_pdfs' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  )
);
