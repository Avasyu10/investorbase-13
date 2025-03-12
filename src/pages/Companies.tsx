
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

  const metricCategories = [
    "PROBLEM", "MARKET", "SOLUTION", "PRODUCT", "COMPETITIVE LANDSCAPE", 
    "TRACTION", "BUSINESS MODEL", "GTM STRATEGY", "TEAM", "FINANCIALS", "ASK"
  ];

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted-foreground mt-1">
          Select a company to view detailed assessment scores
        </p>
      </div>
      
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-2">Assessment Categories</h2>
        <div className="flex flex-wrap gap-2">
          {metricCategories.map(category => (
            <div key={category} className="text-xs bg-gray-100 px-2 py-1 rounded">
              {category}
            </div>
          ))}
        </div>
      </div>
      
      <CompaniesList />
    </div>
  );
};

export default Companies;
