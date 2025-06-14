
-- Add industry, poc_name, and phonenumber columns to companies table
ALTER TABLE public.companies 
ADD COLUMN industry text,
ADD COLUMN poc_name text,
ADD COLUMN phonenumber text;
