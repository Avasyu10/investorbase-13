
import { CompaniesList } from "@/components/companies/CompaniesList";
import { ReportsList } from "@/components/reports/ReportsList";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileUp, BarChart } from "lucide-react";

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("companies");

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
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="market">
              <BarChart className="mr-2 h-4 w-4" />
              Market Research
            </TabsTrigger>
          </TabsList>
          <TabsContent value="companies">
            <CompaniesList />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsList />
          </TabsContent>
          <TabsContent value="market">
            <div className="bg-secondary/30 rounded-lg p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Market Research Hub</h2>
              <p className="mb-4 text-muted-foreground">
                Market insights and benchmarking data will appear here after you upload and analyze pitch decks.
                Each analysis will include extensive market research, competitive benchmarking, and industry trends.
              </p>
              {activeTab === "market" && (
                <Button 
                  onClick={() => navigate("/upload")} 
                  variant="outline"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload Deck for Analysis
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
