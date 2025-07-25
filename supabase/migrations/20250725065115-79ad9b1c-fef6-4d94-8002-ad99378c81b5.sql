-- Fix foreign key constraints to allow proper cascade deletion

-- First, drop the existing foreign key constraint on section_details
ALTER TABLE public.section_details 
DROP CONSTRAINT IF EXISTS section_details_section_id_fkey;

-- Recreate the foreign key with CASCADE DELETE
ALTER TABLE public.section_details 
ADD CONSTRAINT section_details_section_id_fkey 
FOREIGN KEY (section_id) 
REFERENCES public.sections(id) 
ON DELETE CASCADE;

-- Also ensure the sections table has proper cascade on company deletion
ALTER TABLE public.sections 
DROP CONSTRAINT IF EXISTS sections_company_id_fkey;

ALTER TABLE public.sections 
ADD CONSTRAINT sections_company_id_fkey 
FOREIGN KEY (company_id) 
REFERENCES public.companies(id) 
ON DELETE CASCADE;