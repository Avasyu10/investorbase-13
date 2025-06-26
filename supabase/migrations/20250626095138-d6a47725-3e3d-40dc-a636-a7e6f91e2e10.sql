
-- Add deck_url column to companies table to store PDF file paths
ALTER TABLE companies 
ADD COLUMN deck_url text;
