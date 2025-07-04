import { ConditionalCompaniesList } from "@/components/companies/ConditionalCompaniesList";
import { ReportsList } from "@/components/reports/ReportsList";
import { PublicSubmissionsList } from "@/components/submissions/PublicSubmissionsList";
import { VCChatInterface } from "@/components/vc/VCChatInterface";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, Newspaper, ShieldCheck, Settings, GraduationCap, BarChart3, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { EurekaSampleButton } from "@/components/profile/EurekaSampleButton";
const Dashboard = () => {
  const {
    user,
    isLoading
  } = useAuth();
  const {
    profile,
    isIITBombay,
    isVC,
    isVCAndBits,
    isViewOnly,
    isLoading: profileLoading
  } = useProfile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("companies");
  const [isAdmin, setIsAdmin] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (!isLoading && !user) {
      console.log("User not authenticated, redirecting to home");
      navigate('/', {
        state: {
          from: '/dashboard'
        }
      });
    } else if (user && !profileLoading) {
      // Redirect view-only users to the view-only dashboard
      if (isViewOnly) {
        console.log("User has view-only access, redirecting to view dashboard");
        navigate('/view-dashboard');
        return;
      }
      console.log("Dashboard loaded for user:", user.id);
      console.log("Profile data:", profile);
      console.log("Is IIT Bombay user:", isIITBombay);
      console.log("Is VC user:", isVC);
      checkAdminStatus();
    }

    // Scroll to top when dashboard loads
    window.scrollTo(0, 0);
  }, [user, isLoading, navigate, profile, isIITBombay, isVC, isViewOnly, profileLoading]);
  const checkAdminStatus = async () => {
    if (!user) return;
    try {
      // CRITICAL FIX: Check for our specific admin email
      if (user.email === "f20180623@goa.bits-pilani.ac.in") {
        console.log("Detected super admin email, granting admin access");
        setIsAdmin(true);
        return;
      }
      console.log("Checking admin status for user:", user.id);
      const {
        data,
        error
      } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(); // Use maybeSingle to avoid errors if no profile exists

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
  if (isLoading || profileLoading) {
    return <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (!user) return null; // Will redirect in useEffect

  return <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            {isIITBombay && <GraduationCap className="h-8 w-8 text-primary" />}
            <h1 className="text-3xl font-bold tracking-tight">
              {isIITBombay ? "Eureka Dashboard" : "Dashboard"}
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            {isAdmin && <Button onClick={() => navigate("/admin")} variant="outline" className="flex items-center">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admin Panel
              </Button>}
            {isIITBombay}
            {isIITBombay && <EurekaSampleButton />}
            {isVC && !isVCAndBits && <Button onClick={() => navigate("/vc-analysis")} variant="outline" className="flex items-center">
                <BarChart3 className="mr-2 h-4 w-4" />
                Upload Deck
              </Button>}
            <Button onClick={() => navigate("/news-feed")} variant="outline" className="flex items-center">
              <Newspaper className="mr-2 h-4 w-4" />
              News Feed
            </Button>
            {!isIITBombay && !isVC && <Button onClick={() => navigate("/upload")}>
                <FileUp className="mr-2 h-4 w-4" />
                Upload New Deck
              </Button>}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center gap-4">
              <TabsList>
                <TabsTrigger value="companies">
                  {isIITBombay ? "Eureka Prospects" : "Prospects"}
                </TabsTrigger>
                <TabsTrigger value="submissions">New Applications</TabsTrigger>
                {!isIITBombay && <TabsTrigger value="reports">Pitch Decks</TabsTrigger>}
              </TabsList>
              
              {isVC && !isVCAndBits}
            </div>
            
            <div className="mt-6">
              <TabsContent value="companies">
                <ConditionalCompaniesList />
              </TabsContent>
              <TabsContent value="submissions">
                <PublicSubmissionsList />
              </TabsContent>
              {!isIITBombay && <TabsContent value="reports">
                  <ReportsList />
                </TabsContent>}
            </div>
          </Tabs>
        </div>
      </div>

      {/* VC Chat Interface */}
      {isVC && !isVCAndBits && <VCChatInterface open={chatOpen} onOpenChange={setChatOpen} />}
    </div>;
};
export default Dashboard;