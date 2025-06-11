
import { CompaniesList } from "@/components/companies/CompaniesList";
import { ReportsList } from "@/components/reports/ReportsList";
import { PublicSubmissionsList } from "@/components/submissions/PublicSubmissionsList";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, Newspaper, ShieldCheck, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("companies");
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      console.log("User not authenticated, redirecting to home");
      navigate('/', { state: { from: '/dashboard' } });
    } else if (user) {
      console.log("Dashboard loaded for user:", user.id);
      checkAdminStatus();
    }
    
    // Scroll to top when dashboard loads
    window.scrollTo(0, 0);
  }, [user, isLoading, navigate]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      // CRITICAL FIX: Check for our specific admin email
      if (user.email === "f20180623@goa.bits-pilani.ac.in") {
        console.log("Detected super admin email, granting admin access");
        setIsAdmin(true);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error checking admin status:', error);
        return;
      }
      
      console.log('Admin status check in Dashboard:', data);
      setIsAdmin(data?.is_admin === true);
    } catch (err) {
      console.error('Error in admin check:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null; // Will redirect in useEffect

  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            {isAdmin && (
              <Button 
                onClick={() => navigate("/admin")} 
                variant="outline"
                className="flex items-center"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admin Panel
              </Button>
            )}
            <Button 
              onClick={() => navigate("/public-forms")} 
              variant="outline"
              className="flex items-center"
            >
              <Settings className="mr-2 h-4 w-4" />
              Public Forms
            </Button>
            <Button 
              onClick={() => navigate("/news-feed")} 
              variant="outline"
              className="flex items-center"
            >
              <Newspaper className="mr-2 h-4 w-4" />
              News Feed
            </Button>
            <Button 
              onClick={() => navigate("/upload")} 
            >
              <FileUp className="mr-2 h-4 w-4" />
              Upload New Deck
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="companies">Prospects</TabsTrigger>
            <TabsTrigger value="submissions">New Applications</TabsTrigger>
            <TabsTrigger value="reports">Pitch Decks</TabsTrigger>
          </TabsList>
          <TabsContent value="companies">
            <CompaniesList />
          </TabsContent>
          <TabsContent value="submissions">
            <PublicSubmissionsList />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
