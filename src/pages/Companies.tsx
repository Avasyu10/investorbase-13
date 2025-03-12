
import { CompaniesList } from "@/components/companies/CompaniesList";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
          View detailed assessment scores across key metrics: Problem, Market, Solution, Product, Competitive Landscape, 
          Traction, Business Model, GTM Strategy, Team, Financials, and Ask
        </p>
      </div>
      <CompaniesList />
    </div>
  );
};

export default Companies;
