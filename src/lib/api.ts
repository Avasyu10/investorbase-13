
import { supabase } from './supabase';
import { Company, Section, SectionDetail } from './types';

export async function getCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }

  return data as Company[];
}

export async function getCompanyById(id: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching company:', error);
    throw error;
  }

  return data as Company;
}

export async function getSectionsByCompanyId(companyId: string) {
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) {
    console.error('Error fetching sections:', error);
    throw error;
  }

  return data as Section[];
}

export async function getSectionById(sectionId: string) {
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('id', sectionId)
    .single();

  if (error) {
    console.error('Error fetching section:', error);
    throw error;
  }

  return data as Section;
}

export async function getSectionDetailsBySectionId(sectionId: string) {
  const { data, error } = await supabase
    .from('section_details')
    .select('*')
    .eq('section_id', sectionId)
    .order('created_at');

  if (error) {
    console.error('Error fetching section details:', error);
    throw error;
  }

  return data as SectionDetail[];
}
