import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CsvData {
  ideaId: string;
  eurekaId: string;
  score: number;
}

export function useCsvDownload() {
  const { user } = useAuth();

  const downloadEurekaDataAsCsv = async (filename: string = 'eureka-data.csv') => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Fetch all companies with their eureka data in batches
      let allData: CsvData[] = [];
      let start = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        console.log(`Fetching batch ${start / batchSize + 1}...`);
        
        const { data: companies, error } = await supabase
          .from('companies')
          .select(`
            id,
            name,
            overall_score
          `)
          .or(`user_id.eq.${user.id}`)
          .range(start, start + batchSize - 1)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (!companies || companies.length === 0) {
          hasMore = false;
          break;
        }

        // Get eureka form submissions for this batch
        const companyIds = companies.map(c => c.id);
        const { data: eurekaSubmissions } = await supabase
          .from('eureka_form_submissions')
          .select('company_id, idea_id, eureka_id')
          .in('company_id', companyIds);

        // Process this batch
        const batchData: CsvData[] = companies
          .map(company => {
            const eurekaSubmission = eurekaSubmissions?.find(e => e.company_id === company.id);
            if (!eurekaSubmission) return null;
            
            return {
              ideaId: eurekaSubmission.idea_id || '',
              eurekaId: eurekaSubmission.eureka_id || company.name,
              score: Math.round(company.overall_score || 0)
            };
          })
          .filter((item): item is CsvData => item !== null);

        allData = [...allData, ...batchData];
        start += batchSize;
        
        // If we got less than batchSize, we're done
        if (companies.length < batchSize) {
          hasMore = false;
        }
      }

      console.log(`Total records fetched: ${allData.length}`);

      // Generate CSV content
      const headers = ['Idea ID', 'Eureka ID', 'Score'];
      const csvContent = [
        headers.join(','),
        ...allData.map(row => `${row.ideaId},${row.eurekaId},${row.score}`)
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return allData.length;
    } catch (error) {
      console.error('Error downloading CSV:', error);
      throw error;
    }
  };

  return { downloadEurekaDataAsCsv };
}