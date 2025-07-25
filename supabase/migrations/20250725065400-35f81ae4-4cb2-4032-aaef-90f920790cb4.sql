-- Create an admin function to clean up test companies
CREATE OR REPLACE FUNCTION public.cleanup_test_companies()
RETURNS TEXT AS $$
DECLARE
  deleted_count INTEGER := 0;
  company_record RECORD;
BEGIN
  -- First, delete all related data for test companies
  FOR company_record IN 
    SELECT id FROM companies WHERE name ILIKE '%test%' OR name IN ('Test 1', 'Test 5', 'test 1', 'test 5')
  LOOP
    -- Delete section_details first
    DELETE FROM public.section_details 
    WHERE section_id IN (
      SELECT id FROM public.sections WHERE company_id = company_record.id
    );
    
    -- Delete sections
    DELETE FROM public.sections WHERE company_id = company_record.id;
    
    -- Delete other related records
    DELETE FROM public.market_research WHERE company_id = company_record.id;
    DELETE FROM public.investor_research WHERE company_id = company_record.id;
    DELETE FROM public.fund_thesis_analysis WHERE company_id = company_record.id;
    DELETE FROM public.company_details WHERE company_id = company_record.id;
    DELETE FROM public.barc_form_submissions WHERE company_id = company_record.id;
    DELETE FROM public.eureka_form_submissions WHERE company_id = company_record.id;
    
    -- Update reports to remove company reference
    UPDATE public.reports SET company_id = NULL WHERE company_id = company_record.id;
    
    -- Delete the company itself
    DELETE FROM public.companies WHERE id = company_record.id;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN 'Successfully deleted ' || deleted_count || ' test companies and their related data';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;