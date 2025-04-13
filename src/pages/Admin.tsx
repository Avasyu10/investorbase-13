
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Loader2, ShieldCheck } from "lucide-react";
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

const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

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
          fetchData();
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
        fetchData();
      } catch (err) {
        console.error("Error checking admin status:", err);
        setError("Failed to verify admin privileges");
        navigate('/dashboard');
      }
    };

    checkAdminStatus();
  }, [user, navigate, toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      
      // Fetch all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      setUsers(usersData as UserProfile[]);
      setCompanies(companiesData as Company[]);
    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="companies">Companies ({companies.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <div className="rounded-md border">
            <Table>
              <TableCaption>List of all registered users</TableCaption>
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
              <TableCaption>List of all companies</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Overall Rating</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>{company.name || "N/A"}</TableCell>
                    <TableCell>{company.overall_score}</TableCell>
                    <TableCell>{new Date(company.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {companies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">No companies found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
