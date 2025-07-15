
-- First, let's check what companies exist before June 3, 2025
-- and then remove them more explicitly

-- Remove companies with names like SynergyX, PSI, etc. that are before June 3, 2025
DELETE FROM companies 
WHERE created_at < '2025-06-03 00:00:00+00'::timestamptz
AND (
  LOWER(name) LIKE '%synergyx%' OR 
  LOWER(name) LIKE '%psi%' OR
  LOWER(name) LIKE '%jobsphere%' OR
  LOWER(name) LIKE '%mukta%' OR
  created_at < '2025-06-03 00:00:00+00'::timestamptz
);

-- Also remove any companies that might have slipped through with similar patterns
DELETE FROM companies 
WHERE created_at < '2025-06-03 00:00:00+00'::timestamptz;

-- Clean up orphaned records again
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
