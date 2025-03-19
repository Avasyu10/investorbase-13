
import { CompaniesList } from "@/components/companies/CompaniesList";
import { ReportsList } from "@/components/reports/ReportsList";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("companies");

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { state: { from: '/dashboard' } });
    }
  }, [user, isLoading, navigate]);

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
          <Button 
            onClick={() => navigate("/upload")} 
            className="mt-4 sm:mt-0"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Upload New Deck
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="reports">Pitch Decks</TabsTrigger>
          </TabsList>
          <TabsContent value="companies">
            <CompaniesList />
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
