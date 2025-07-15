
-- Remove companies created before June 3, 2025
DELETE FROM companies 
WHERE created_at < '2025-06-03 00:00:00+00'::timestamptz;

-- Also clean up any orphaned records that might reference deleted companies
DELETE FROM company_details 
WHERE company_id NOT IN (SELECT id FROM companies);

DELETE FROM sections 
WHERE company_id NOT IN (SELECT id FROM companies);

DELETE FROM section_details 
WHERE section_id NOT IN (SELECT id FROM sections);

DELETE FROM fund_thesis_analysis 
WHERE company_id NOT IN (SELECT id FROM companies);

DELETE FROM market_research 
WHERE company_id NOT IN (SELECT id FROM companies);

DELETE FROM investor_research 
WHERE company_id NOT IN (SELECT id FROM companies);
