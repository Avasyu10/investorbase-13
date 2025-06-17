
-- First, let's check if the form exists
SELECT * FROM public_submission_forms WHERE form_slug = 'm92a7cet-l698ke';

-- Get any existing user ID to use as the owner
-- We'll use the first available user, or create a system user if none exists
DO $$
DECLARE
    existing_user_id uuid;
    system_user_id uuid;
BEGIN
    -- Try to get an existing user
    SELECT id INTO existing_user_id FROM profiles LIMIT 1;
    
    -- If no users exist, we'll use a placeholder UUID
    IF existing_user_id IS NULL THEN
        system_user_id := '00000000-0000-0000-0000-000000000000';
    ELSE
        system_user_id := existing_user_id;
    END IF;
    
    -- Insert the missing form record
    INSERT INTO public_submission_forms (
        form_name,
        form_slug,
        form_type,
        is_active,
        auto_analyze,
        user_id
    ) 
    VALUES (
        'General Public Submission Form',
        'm92a7cet-l698ke',
        'general',
        true,
        false,
        system_user_id
    )
    ON CONFLICT (form_slug) DO NOTHING;
END $$;

-- Make the form_slug column nullable to prevent future issues
ALTER TABLE public_form_submissions 
ALTER COLUMN form_slug DROP NOT NULL;

-- Drop the foreign key constraint to allow more flexibility
ALTER TABLE public_form_submissions 
DROP CONSTRAINT IF EXISTS public_form_submissions_form_slug_fkey;
