
-- Ensure we have the correct bucket with the right name
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-pdfs', 'report-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated upload to report_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow reading report_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow updating own report_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow deleting own report_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to report-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow reading from report-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow updating own files in report-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow deleting own files in report-pdfs" ON storage.objects;

-- Create simple, permissive policies for report-pdfs bucket
CREATE POLICY "Enable all operations for report-pdfs" ON storage.objects
FOR ALL USING (bucket_id = 'report-pdfs');

-- Alternative more specific policies if the above doesn't work
CREATE POLICY "Enable upload for report-pdfs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'report-pdfs');

CREATE POLICY "Enable read for report-pdfs" ON storage.objects
FOR SELECT USING (bucket_id = 'report-pdfs');

CREATE POLICY "Enable update for report-pdfs" ON storage.objects
FOR UPDATE USING (bucket_id = 'report-pdfs');

CREATE POLICY "Enable delete for report-pdfs" ON storage.objects
FOR DELETE USING (bucket_id = 'report-pdfs');
