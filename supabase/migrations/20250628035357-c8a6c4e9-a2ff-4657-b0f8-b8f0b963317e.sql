
-- Create the bitsanalysis table
CREATE TABLE public.bitsanalysis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_name text NOT NULL,
  analysis_result jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the table
ALTER TABLE public.bitsanalysis ENABLE ROW LEVEL SECURITY;

-- Create permissive policies since this will be used by a public edge function
CREATE POLICY "Allow all operations on bitsanalysis"
  ON public.bitsanalysis
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create trigger for updating the updated_at column
CREATE OR REPLACE FUNCTION update_bitsanalysis_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bitsanalysis_updated_at_trigger
  BEFORE UPDATE ON public.bitsanalysis
  FOR EACH ROW
  EXECUTE FUNCTION update_bitsanalysis_updated_at();
