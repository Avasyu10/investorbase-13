
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { getCompanyById } from "@/lib/api";
import { SectionsList } from "@/components/sections/SectionsList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const CompanyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', id],
    queryFn: () => getCompanyById(id as string),
    enabled: !!id && !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-6 text-destructive">
          <h3 className="font-bold">Error loading company</h3>
          <p>{(error as Error).message}</p>
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

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <Button 
        variant="ghost" 
        className="mb-6 -ml-2" 
        onClick={() => navigate("/companies")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to companies
      </Button>
      
      <div className="bg-card p-6 rounded-lg shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            {company.logo_url && (
              <img 
                src={company.logo_url}
                alt={`${company.name} logo`}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <h1 className="text-3xl font-bold">{company.name}</h1>
          </div>
          <div className="text-4xl font-bold">{company.total_score}/100</div>
        </div>
        
        <Progress value={company.total_score} className="h-3" />
      </div>
      
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">Section Scores</h2>
      </div>
      
      <SectionsList companyId={company.id} />
    </div>
  );
};

export default CompanyDetails;
