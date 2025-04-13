
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Company {
  id: string;
  name: string;
  overall_score: number;
  user_id: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

export const AdminCompaniesList = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        
        // Fetch all companies with their owners' profile information
        const { data, error } = await supabase
          .from('companies')
          .select('*, profile:user_id(full_name, email)')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setCompanies(data || []);
      } catch (err: any) {
        console.error('Error fetching companies:', err);
        setError(err.message || 'Failed to load companies');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  // Filter companies based on search term
  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-500">
          <p>Error loading companies: {error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 shadow-sm">
      <div className="mb-4">
        <Input
          placeholder="Search companies or users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company Name</TableHead>
            <TableHead>Overall Score</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCompanies.length > 0 ? (
            filteredCompanies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <Link 
                    to={`/company/${company.id}`}
                    className="text-primary hover:underline"
                  >
                    {company.name}
                  </Link>
                </TableCell>
                <TableCell>{company.overall_score?.toFixed(1) || 'N/A'}</TableCell>
                <TableCell>
                  {company.profile?.full_name || 'N/A'}
                  {company.profile?.email && (
                    <div className="text-sm text-gray-500">
                      {company.profile.email}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {company.created_at
                    ? new Date(company.created_at).toLocaleDateString()
                    : 'N/A'}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">
                {searchTerm ? 'No matches found' : 'No companies found'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
};
