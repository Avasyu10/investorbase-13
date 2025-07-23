
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { ViewOnlyCompaniesList } from "@/components/companies/ViewOnlyCompaniesList";
import { VCConnectNotifications } from "@/components/companies/VCConnectNotifications";
import { Building2, Bell } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ViewOnlyDashboard() {
  const { profile, isLoading } = useProfile();
  const [activeTab, setActiveTab] = useState("companies");

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Redirect if user doesn't have view permission
  if (!profile?.is_view) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">View Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            View-only access to company data and connection notifications
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Connect Notifications
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="companies">
            <ViewOnlyCompaniesList />
          </TabsContent>
          
          <TabsContent value="notifications">
            <VCConnectNotifications />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
