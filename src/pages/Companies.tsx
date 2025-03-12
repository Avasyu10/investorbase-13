
import { CompaniesList } from "@/components/companies/CompaniesList";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, 
  Globe, 
  CheckCircle, 
  Box, 
  BarChart, 
  TrendingUp, 
  Briefcase, 
  Navigation, 
  Users, 
  DollarSign, 
  HelpCircle 
} from "lucide-react";

const Companies = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted-foreground mt-1">
          Select a company to view detailed scores
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Evaluation Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Problem
            </h3>
            <p className="text-sm text-muted-foreground">Clear, specific problem with strong pain point</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              Market
            </h3>
            <p className="text-sm text-muted-foreground">Large addressable market with growth potential</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Solution
            </h3>
            <p className="text-sm text-muted-foreground">Differentiated solution with clear value proposition</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Box className="h-4 w-4 text-indigo-500" />
              Product
            </h3>
            <p className="text-sm text-muted-foreground">Well-designed product with technical feasibility</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <BarChart className="h-4 w-4 text-purple-500" />
              Competitive Landscape
            </h3>
            <p className="text-sm text-muted-foreground">Analysis of market position and competitors</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-rose-500" />
              Traction
            </h3>
            <p className="text-sm text-muted-foreground">Customer adoption and growth metrics</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-orange-500" />
              Business Model
            </h3>
            <p className="text-sm text-muted-foreground">Sustainable business model with clear revenue streams</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Navigation className="h-4 w-4 text-cyan-500" />
              GTM Strategy
            </h3>
            <p className="text-sm text-muted-foreground">Strategic go-to-market plan and execution</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-500" />
              Team
            </h3>
            <p className="text-sm text-muted-foreground">Quality of founding team and key hires</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Financials
            </h3>
            <p className="text-sm text-muted-foreground">Financial projections, unit economics, and capital planning</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-red-500" />
              Ask
            </h3>
            <p className="text-sm text-muted-foreground">Clarity and appropriateness of funding request</p>
          </div>
        </div>
      </div>
      
      <CompaniesList />
    </div>
  );
};

export default Companies;
