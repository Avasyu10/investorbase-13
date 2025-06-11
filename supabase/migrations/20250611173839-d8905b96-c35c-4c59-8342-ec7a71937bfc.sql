
-- Add a company_id column to barc_form_submissions to link to created companies
ALTER TABLE barc_form_submissions 
ADD COLUMN company_id uuid REFERENCES companies(id);

-- Create an index for better performance
CREATE INDEX idx_barc_form_submissions_company_id ON barc_form_submissions(company_id);
