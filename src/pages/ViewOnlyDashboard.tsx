
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { ViewOnlyCompaniesList } from "@/components/companies/ViewOnlyCompaniesList";
import { VCConnectNotifications } from "@/components/vc/VCConnectNotifications";
import { VCChatDashboard } from "@/components/vc/VCChatDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, MessageCircle, MessagesSquare } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function ViewOnlyDashboard() {
  const { profile, isLoading, isVC } = useProfile();

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
          <h1 className="text-2xl font-bold tracking-tight">View-Only Dashboard</h1>
          <p className="text-muted-foreground">
            View companies and VC connection alerts
          </p>
        </div>
      </div>

      <Tabs defaultValue="companies" className="w-full">
        <TabsList className={`grid w-full ${isVC ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            VC Alerts
          </TabsTrigger>
          {isVC && (
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4" />
              Founder Chats
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="companies" className="mt-6">
          <ViewOnlyCompaniesList />
        </TabsContent>
        
        <TabsContent value="connections" className="mt-6">
          <VCConnectNotifications />
        </TabsContent>
        
        {isVC && (
          <TabsContent value="chats" className="mt-6">
            <VCChatDashboard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
