
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Users can view their own eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Service role can access all eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Admins can access all eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Allow anonymous and authenticated submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Users can view submissions they created or admins can view all" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Admins can manage all eureka submissions" ON public.eureka_form_submissions;

-- Enable RLS if not already enabled
ALTER TABLE public.eureka_form_submissions ENABLE ROW LEVEL SECURITY;

-- Create new policies for eureka form submissions
CREATE POLICY "Allow all users to insert eureka submissions" 
ON public.eureka_form_submissions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own eureka submissions or anonymous ones" 
ON public.eureka_form_submissions 
FOR SELECT 
USING (
    auth.uid() = user_id 
    OR user_id IS NULL 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

CREATE POLICY "Admins can manage all eureka submissions" 
ON public.eureka_form_submissions 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);
