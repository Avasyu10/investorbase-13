
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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

  // Add effect to refresh data when page changes
  useEffect(() => {
    if (isAdmin) {
      fetchData(currentPage, pageSize);
    }
  }, [currentPage, activeTab, isAdmin]);

  const fetchData = async (page: number, limit: number) => {
    try {
      setLoading(true);
      
      // Calculate offset based on page number
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      console.log(`Fetching data for page ${page}, tab: ${activeTab}, from: ${from}, to: ${to}`);
      
      if (activeTab === "users" || activeTab === "") {
        // Fetch users with pagination
        const { data: usersData, error: usersError, count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .range(from, to)
          .order('created_at', { ascending: false });

        if (usersError) {
          console.error("Error fetching users:", usersError);
          throw usersError;
        }
        
        setUsers(usersData as UserProfile[] || []);
        setTotalCount(usersCount || 0);
        setTotalPages(Math.ceil((usersCount || 0) / limit));
        
        console.log(`Loaded ${usersData?.length || 0} users of ${usersCount || 0} total`);
      } else {
        // Fetch companies with pagination
        const { data: companiesData, error: companiesError, count: companiesCount } = await supabase
          .from('companies')
          .select('id, name, overall_score, created_at, user_id', { count: 'exact' })
          .range(from, to)
          .order('created_at', { ascending: false });

        if (companiesError) {
          console.error("Error fetching companies:", companiesError);
          throw companiesError;
        }
        
        console.log(`Fetched ${companiesData?.length || 0} companies`);
        
        // Extract user IDs from companies (filtering out null values)
        const userIds = companiesData
          .map(company => company.user_id)
          .filter((id): id is string => id !== null);
        
        console.log(`Found ${userIds.length} unique user IDs to fetch emails for`);
        
        // Only fetch profiles if we have user IDs
        let userEmailMap: Record<string, string> = {};
        
        if (userIds.length > 0) {
          // Fetch all relevant user profiles in one query
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', userIds);
            
          if (profilesError) {
            console.error("Error fetching user emails:", profilesError);
            throw profilesError;
          }
          
          console.log(`Fetched ${profilesData?.length || 0} user profiles`);
          
          // Create map of user IDs to emails
          userEmailMap = (profilesData || []).reduce((map: Record<string, string>, profile) => {
            if (profile.id && profile.email) {
              map[profile.id] = profile.email;
            }
            return map;
          }, {});
          
          console.log("User email map created:", userEmailMap);
        }
        
        // Map companies with their user emails
        const companiesWithEmails = companiesData.map(company => ({
          ...company,
          userEmail: company.user_id && userEmailMap[company.user_id] 
            ? userEmailMap[company.user_id] 
            : null
        }));
        
        console.log("Companies with emails:", companiesWithEmails);
        
        setCompanies(companiesWithEmails);
        setTotalCount(companiesCount || 0);
        setTotalPages(Math.ceil((companiesCount || 0) / limit));
      }
    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setCurrentPage(1); // Reset to first page when changing tabs
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
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
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users ({activeTab === "users" ? totalCount : "?"})</TabsTrigger>
          <TabsTrigger value="companies">Companies ({activeTab === "companies" ? totalCount : "?"})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <div className="rounded-md border">
            <Table>
              <TableCaption>
                Page {currentPage} of {totalPages || 1}
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
                Page {currentPage} of {totalPages || 1}
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
                    <TableCell>{company.userEmail || "N/A"}</TableCell>
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

      {/* Pagination Controls */}
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
    </div>
  );
};

export default AdminPage;
