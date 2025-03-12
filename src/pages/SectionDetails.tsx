
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { getCompanyById, getSectionById } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { SectionDetail } from "@/components/sections/SectionDetail";
import { SectionSidebar } from "@/components/sections/SectionSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
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

const SectionDetails = () => {
  const { companyId, sectionId } = useParams<{ companyId: string, sectionId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => getCompanyById(companyId as string),
    enabled: !!companyId && !!user,
  });

  const { data: section, isLoading: sectionLoading, error } = useQuery({
    queryKey: ['section', sectionId],
    queryFn: () => getSectionById(sectionId as string),
    enabled: !!sectionId && !!user,
  });

  const isLoading = authLoading || companyLoading || sectionLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) return null;

  if (error || !section) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-6 text-destructive">
          <h3 className="font-bold">Error loading section</h3>
          <p>{error ? (error as Error).message : "Section not found"}</p>
          <Button 
            variant="ghost" 
            className="mt-4"
            onClick={() => navigate(`/companies/${companyId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to company
          </Button>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-6 text-muted-foreground">
          <p>Company not found.</p>
          <Button 
            variant="ghost" 
            className="mt-4"
            onClick={() => navigate("/companies")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to companies
          </Button>
        </div>
      </div>
    );
  }

  const getMetricIcon = (metricType?: string) => {
    switch (metricType) {
      case 'PROBLEM':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'MARKET':
        return <Globe className="h-5 w-5 text-blue-500" />;
      case 'SOLUTION':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'PRODUCT':
        return <Box className="h-5 w-5 text-indigo-500" />;
      case 'COMPETITIVE_LANDSCAPE':
        return <BarChart className="h-5 w-5 text-purple-500" />;
      case 'TRACTION':
        return <TrendingUp className="h-5 w-5 text-rose-500" />;
      case 'BUSINESS_MODEL':
        return <Briefcase className="h-5 w-5 text-orange-500" />;
      case 'GTM_STRATEGY':
        return <Navigation className="h-5 w-5 text-cyan-500" />;
      case 'TEAM':
        return <Users className="h-5 w-5 text-teal-500" />;
      case 'FINANCIALS':
        return <DollarSign className="h-5 w-5 text-emerald-500" />;
      case 'ASK':
        return <HelpCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const metricIcon = getMetricIcon(section.metric_type);

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <Button 
        variant="ghost" 
        className="mb-6 -ml-2" 
        onClick={() => navigate(`/companies/${companyId}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to {company.name}
      </Button>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-64 flex-shrink-0">
          <div className="sticky top-20 bg-background border rounded-lg overflow-hidden">
            <SectionSidebar companyId={companyId as string} />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="bg-card p-6 rounded-lg shadow-sm mb-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                {metricIcon}
                <div>
                  <h1 className="text-2xl font-bold">{section.name}</h1>
                  {section.description && (
                    <p className="text-muted-foreground mt-1">{section.description}</p>
                  )}
                </div>
              </div>
              <div className="text-3xl font-bold">{section.score}/{section.max_score}</div>
            </div>
            
            <Progress value={(section.score / section.max_score) * 100} className="h-3" />
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Detailed Analysis</h2>
          </div>
          
          <SectionDetail sectionId={section.id} />
        </div>
      </div>
    </div>
  );
};

export default SectionDetails;
