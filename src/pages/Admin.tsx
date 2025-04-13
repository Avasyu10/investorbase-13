
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ChevronLeft, ChevronRight, AlertCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  is_admin: boolean;
  created_at: string;
};

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<CompanyWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState("users");
  const pageSize = 10;

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
    if (isAdmin && !searchQuery) {
      fetchData(currentPage, pageSize);
    }
  }, [currentPage, activeTab, isAdmin]);

  // Listen for search query changes and search across all data
  useEffect(() => {
    if (isAdmin && searchQuery) {
      performSearch();
    }
  }, [searchQuery, activeTab]);

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      fetchData(currentPage, pageSize);
      return;
    }

    setLoading(true);
    
    try {
      if (activeTab === "users") {
        // For users, search without pagination to get all matching results
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
          
        if (profilesError) throw profilesError;
        
        setUsers(profilesData as UserProfile[] || []);
        
        // Hide pagination during search
        setTotalCount(profilesData?.length || 0);
        setTotalPages(1); // No pagination during search
      } else {
        // For companies, search across all companies without pagination
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select(`
            id, name, overall_score, created_at, user_id
          `)
          .or(`name.ilike.%${searchQuery}%`)
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
        
        // Map companies with their user emails
        const companiesWithEmails = companiesData.map(company => {
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
        
        // Filter companies again by user email if needed
        const filteredCompanies = searchQuery 
          ? companiesWithEmails.filter(company => 
              company.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              (company.userEmail && typeof company.userEmail === 'string' && company.userEmail.toLowerCase().includes(searchQuery.toLowerCase()))
            )
          : companiesWithEmails;
        
        setCompanies(filteredCompanies);
        
        // Hide pagination during search
        setTotalCount(filteredCompanies.length);
        setTotalPages(1); // No pagination during search
      }
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

      console.log(`Fetching data for page ${page}, tab: ${activeTab}, from: ${from}, to: ${to}`);
      
      if (activeTab === "users" || activeTab === "") {
        // Fetch users from profiles table
        const { data: profilesData, error: profilesError, count: profilesCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .range(from, to)
          .order('created_at', { ascending: false });

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          throw profilesError;
        }
        
        setUsers(profilesData as UserProfile[] || []);
        setTotalCount(profilesCount || 0);
        setTotalPages(Math.ceil((profilesCount || 0) / limit));
        
        console.log(`Loaded ${profilesData?.length || 0} profiles of ${profilesCount || 0} total`);
      } else {
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
      }
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
    setCurrentPage(1); // Reset to page 1 for new search
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setCurrentPage(1); // Reset to first page when changing tabs
    setSearchQuery(""); // Clear search when changing tabs
  };

  // Reset search
  const clearSearch = () => {
    setSearchQuery("");
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
          placeholder={`Search ${activeTab === "users" ? "users by name or email" : "companies by name or user email"}`}
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
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users ({searchQuery ? users.length : totalCount})</TabsTrigger>
          <TabsTrigger value="companies">Companies ({searchQuery ? companies.length : totalCount})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <div className="rounded-md border">
            <Table>
              <TableCaption>
                {searchQuery ? (
                  `Found ${users.length} users matching "${searchQuery}"`
                ) : (
                  `Page ${currentPage} of ${totalPages || 1}`
                )}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Admin Status</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.full_name || "N/A"}</TableCell>
                    <TableCell>{user.email || "N/A"}</TableCell>
                    <TableCell>{user.username || "N/A"}</TableCell>
                    <TableCell>{user.is_admin ? "Admin" : "User"}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="companies">
          <div className="rounded-md border">
            <Table>
              <TableCaption>
                {searchQuery ? (
                  `Found ${companies.length} companies matching "${searchQuery}"`
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
        </TabsContent>
      </Tabs>

      {/* Pagination Controls - Only show when not searching */}
      {!searchQuery && (
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
