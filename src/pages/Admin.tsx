
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ChevronLeft, ChevronRight, AlertCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

type Company = {
  id: string;
  name: string;
  overall_score: number;
  created_at: string;
  user_id: string | null;
};

// Extended company type that includes the email after fetching from profiles
type CompanyWithEmail = Company & {
  userEmail: string | null;
};

const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        if (!user) {
          navigate('/');
          return;
        }

        // CRITICAL FIX: Make admin email check explicit for this test user
        if (user.email === "f20180623@goa.bits-pilani.ac.in") {
          console.log("Detected super admin email, granting admin access");
          setIsAdmin(true);
          fetchData(1, pageSize); // Always start with page 1 when checking admin status
          return;
        }

        // Check if the current user is an admin in profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Admin check error details:", error);
          toast({
            title: "Admin check failed",
            description: "Could not verify admin status",
            variant: "destructive",
          });
          throw error;
        }

        console.log("Admin status check result:", data);
        
        if (!data || data.is_admin !== true) {
          console.log("User is not an admin, redirecting");
          toast({
            title: "Access denied",
            description: "You don't have admin privileges",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        setIsAdmin(true);
        fetchData(1, pageSize); // Always start with page 1 when checking admin status
      } catch (err) {
        console.error("Error checking admin status:", err);
        setError("Failed to verify admin privileges");
        navigate('/dashboard');
      }
    };

    checkAdminStatus();
  }, [user, navigate, toast]);

  // Add effect to refresh data when page changes, except during search
  useEffect(() => {
    if (isAdmin && !debouncedSearchQuery) {
      fetchData(currentPage, pageSize);
    }
  }, [currentPage, isAdmin, debouncedSearchQuery]);

  // Listen for debounced search query changes and search across all data
  useEffect(() => {
    if (isAdmin) {
      if (debouncedSearchQuery) {
        performSearch();
      } else {
        // Reset to page 1 and show all results when search is cleared
        setCurrentPage(1);
        fetchData(1, pageSize);
      }
    }
  }, [debouncedSearchQuery, isAdmin]);

  const performSearch = async () => {
    if (!debouncedSearchQuery.trim()) {
      fetchData(currentPage, pageSize);
      return;
    }

    setLoading(true);
    
    try {
      // For companies, search across all companies without pagination
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select(`
          id, name, overall_score, created_at, user_id
        `)
        .or(`name.ilike.%${debouncedSearchQuery}%`)
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;
      
      // Extract unique user IDs from companies (filtering out null values)
      const userIds = companiesData
        .map(company => company.user_id)
        .filter((id): id is string => id !== null);
        
      // Remove duplicates
      const uniqueUserIds = [...new Set(userIds)];
      
      // Create an empty map to store user emails
      let userEmailMap: Record<string, string | null> = {};
      
      // Only try to fetch emails if we have user IDs
      if (uniqueUserIds.length > 0) {
        try {
          // Get the access token from the session
          const session = await supabase.auth.getSession();
          const accessToken = session.data.session?.access_token || '';
          
          // Call the edge function to get all user emails
          const response = await fetch(
            'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/get-user-emails',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
              },
              body: JSON.stringify({ userIds: uniqueUserIds })
            }
          );
          
          if (response.ok) {
            const profilesData = await response.json();
            
            userEmailMap = profilesData.reduce((map: Record<string, string | null>, profile: {id: string, email: string | null}) => {
              map[profile.id] = profile.email;
              return map;
            }, {});
          } else {
            const errorText = await response.text();
            throw new Error(`Edge function error: ${errorText}`);
          }
        } catch (err) {
          console.error("Error in email lookup:", err);
          toast({
            title: "Error fetching emails",
            description: "Could not retrieve all user emails",
            variant: "destructive",
          });
        }
      }

      // Search for users by email
      let emailMatchCompanies: Company[] = [];
      try {
        // Get the access token from the session
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token || '';
        
        // Call the edge function to search users by email
        const response = await fetch(
          'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/get-user-emails',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
            },
            body: JSON.stringify({ searchEmail: debouncedSearchQuery })
          }
        );
        
        if (response.ok) {
          const userMatches = await response.json();
          console.log("User email search results:", userMatches);
          
          // If we found any email matches, get their companies
          if (userMatches && userMatches.length > 0) {
            // Extract user IDs from matches
            const userIds = userMatches.map((user: any) => user.id);
            console.log("Found matching user IDs by email:", userIds);
            
            // Get companies for these users
            const { data: userCompanies, error: userCompaniesError } = await supabase
              .from('companies')
              .select(`
                id, name, overall_score, created_at, user_id
              `)
              .in('user_id', userIds)
              .order('created_at', { ascending: false });
              
            if (!userCompaniesError && userCompanies) {
              console.log("Found companies for email-matched users:", userCompanies);
              // Add these companies to our results
              emailMatchCompanies = userCompanies;
              
              // Also update user email map with these matches
              userMatches.forEach((user: any) => {
                userEmailMap[user.id] = user.email;
              });
            }
          }
        } else {
          const errorText = await response.text();
          console.error("Error searching by email:", errorText);
        }
      } catch (err) {
        console.error("Error searching users by email:", err);
      }
      
      // Combine company search results and email search results
      const combinedCompanies = [...companiesData, ...emailMatchCompanies];
      console.log("Combined companies before deduplication:", combinedCompanies.length);
      
      // Remove duplicates by ID
      const uniqueCompanies = combinedCompanies.reduce((acc: Company[], company) => {
        if (!acc.find(c => c.id === company.id)) {
          acc.push(company);
        }
        return acc;
      }, []);
      
      console.log("Unique companies after deduplication:", uniqueCompanies.length);
      
      // Map companies with their user emails
      const companiesWithEmails = uniqueCompanies.map(company => {
        let displayEmail = "N/A";
        
        if (company.user_id) {
          if (company.user_id in userEmailMap) {
            displayEmail = userEmailMap[company.user_id] || "N/A";
          }
        }
        
        return {
          ...company,
          userEmail: displayEmail
        };
      });
      
      console.log("Final search results:", companiesWithEmails.length);
      
      setCompanies(companiesWithEmails);
      
      // Hide pagination during search
      setTotalCount(companiesWithEmails.length);
      setTotalPages(1); // No pagination during search
    } catch (err: any) {
      console.error("Error performing search:", err);
      setError(err.message);
      toast({
        title: "Search failed",
        description: err.message || "Failed to search data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (page: number, limit: number) => {
    try {
      setLoading(true);
      
      // Calculate offset based on page number
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      console.log(`Fetching data for page ${page}, from: ${from}, to: ${to}`);
      
      // Fetch companies with pagination
      const { data: companiesData, error: companiesError, count: companiesCount } = await supabase
        .from('companies')
        .select(`
          id, name, overall_score, created_at, user_id
        `, { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      if (companiesError) {
        console.error("Error fetching companies:", companiesError);
        throw companiesError;
      }
      
      console.log(`Fetched ${companiesData?.length || 0} companies`);
      
      // Extract unique user IDs from companies (filtering out null values)
      const userIds = companiesData
        .map(company => company.user_id)
        .filter((id): id is string => id !== null);
        
      // Remove duplicates
      const uniqueUserIds = [...new Set(userIds)];
      
      console.log(`Found ${uniqueUserIds.length} unique user IDs:`, uniqueUserIds);
      
      // Create an empty map to store user emails
      let userEmailMap: Record<string, string | null> = {};
      
      // Only try to fetch emails if we have user IDs
      if (uniqueUserIds.length > 0) {
        try {
          // Get the access token from the session
          const session = await supabase.auth.getSession();
          const accessToken = session.data.session?.access_token || '';
          
          // Call the edge function to get all user emails
          const response = await fetch(
            'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/get-user-emails',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
              },
              body: JSON.stringify({ userIds: uniqueUserIds })
            }
          );
          
          if (response.ok) {
            const profilesData = await response.json();
            console.log("Edge function fetch response:", profilesData);
            
            userEmailMap = profilesData.reduce((map: Record<string, string | null>, profile: {id: string, email: string | null}) => {
              map[profile.id] = profile.email;
              return map;
            }, {});
            
            console.log("Created email map from edge function:", userEmailMap);
          } else {
            const errorText = await response.text();
            console.error("Error from edge function fetch:", errorText);
            throw new Error(`Edge function error: ${errorText}`);
          }
        } catch (err) {
          console.error("Error in email lookup:", err);
          toast({
            title: "Error fetching emails",
            description: "Could not retrieve all user emails",
            variant: "destructive",
          });
        }
      }
      
      // Map companies with their user emails
      const companiesWithEmails = companiesData.map(company => {
        let displayEmail = "N/A";
        
        if (company.user_id) {
          if (company.user_id in userEmailMap) {
            displayEmail = userEmailMap[company.user_id] || "N/A";
          }
        }
        
        console.log(`Company ${company.name} (${company.id}) with user_id ${company.user_id} mapped to email:`, displayEmail);
        
        return {
          ...company,
          userEmail: displayEmail
        };
      });
      
      console.log("Final companies with emails:", companiesWithEmails);
      
      setCompanies(companiesWithEmails);
      setTotalCount(companiesCount || 0);
      setTotalPages(Math.ceil((companiesCount || 0) / limit));
    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError(err.message);
      toast({
        title: "Error loading data",
        description: err.message || "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle search functionality
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Reset search
  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    fetchData(1, pageSize);
    setCurrentPage(1);
  };

  if (!isAdmin) {
    return null; // This will be handled by the useEffect redirect
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>
      
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search companies by name or user email"
          value={searchQuery}
          onChange={handleSearch}
          className="pl-10"
        />
        {searchQuery && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-2"
          >
            Clear
          </Button>
        )}
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableCaption>
            {debouncedSearchQuery ? (
              `Found ${companies.length} companies matching "${debouncedSearchQuery}"`
            ) : (
              `Page ${currentPage} of ${totalPages || 1}`
            )}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>User Email</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Overall Rating</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>{company.userEmail}</TableCell>
                <TableCell>{company.name || "N/A"}</TableCell>
                <TableCell>{company.overall_score}</TableCell>
                <TableCell>{new Date(company.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">No companies found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls - Only show when not searching */}
      {!debouncedSearchQuery && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            size="sm"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
