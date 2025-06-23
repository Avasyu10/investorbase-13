
-- Create the report_pdfs storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report_pdfs',
  'report_pdfs', 
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
);

-- Create policy to allow authenticated users to upload PDFs
CREATE POLICY "Authenticated users can upload PDFs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'report_pdfs' 
  AND auth.role() = 'authenticated'
);

-- Create policy to allow users to read PDFs they uploaded or public submissions
CREATE POLICY "Users can read accessible PDFs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'report_pdfs' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.pdf_url = name 
      AND r.is_public_submission = true
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  )
);

-- Create policy to allow users to update their own PDFs
CREATE POLICY "Users can update their own PDFs" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'report_pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to delete their own PDFs
CREATE POLICY "Users can delete their own PDFs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'report_pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
