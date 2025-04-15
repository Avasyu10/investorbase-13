
-- Function to increment a value in a table
CREATE OR REPLACE FUNCTION increment(row_id uuid, increment_by int)
RETURNS int 
LANGUAGE plpgsql AS $$
DECLARE
   current_value int;
   new_value int;
BEGIN
   -- Get the current analysis_count value
   SELECT analysis_count INTO current_value 
   FROM profiles 
   WHERE id = row_id;
   
   -- Calculate new value
   new_value := current_value + increment_by;
   
   -- Update the record
   UPDATE profiles SET analysis_count = new_value WHERE id = row_id;
   
   -- Return the new value
   RETURN new_value;
END;
$$;
