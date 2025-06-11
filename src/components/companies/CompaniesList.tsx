
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Building2 } from "lucide-react";
import { CompaniesTable } from "./CompaniesTable";
import { useAuth } from "@/hooks/useAuth";

interface Company {
  id: string;
  name: string;
  overall_score: number;
  created_at: string;
  source: string;
  user_id?: string;
  report_id?: string;
}

export function CompaniesList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchCompanies() {
      try {
        if (!user) {
          console.log("No user found, clearing companies");
          setCompanies([]);
          setIsLoading(false);
          return;
        }
        
        setIsLoading(true);
        console.log("Fetching companies for user:", user.id, "email:", user.email);
        
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error("Error fetching companies:", error);
          toast({
            title: "Failed to load companies",
            description: "Please try again later or contact support",
            variant: "destructive",
          });
        } else {
          console.log("Companies fetched successfully:", data?.length || 0);
          setCompanies(data || []);
        }
      } catch (error) {
        console.error("Error in fetchCompanies:", error);
        toast({
          title: "Failed to load companies",
          description: "Please try again later or contact support",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompanies();
  }, [toast, user]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Authentication Required</h3>
          <p className="mt-2 text-muted-foreground">
            Please sign in to view your prospects
          </p>
          <Button 
            onClick={() => navigate("/")} 
            className="mt-6"
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Prospects</h1>
          <p className="text-muted-foreground">
            Track and manage your investment prospects
          </p>
        </div>
      </div>

      {companies.length > 0 ? (
        <CompaniesTable companies={companies} />
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No prospects found</h3>
          <p className="mt-2 text-muted-foreground">
            Upload your first pitch deck to start analyzing prospects.
          </p>
          <Button 
            onClick={() => navigate("/upload")} 
            className="mt-6"
          >
            Upload Your First Deck
          </Button>
        </div>
      )}
    </div>
  );
}
