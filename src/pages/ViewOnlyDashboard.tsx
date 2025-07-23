
import { useProfile } from "@/hooks/useProfile";
import { ViewOnlyCompaniesList } from "@/components/companies/ViewOnlyCompaniesList";
import { Building2 } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function ViewOnlyDashboard() {
  const { profile, isLoading } = useProfile();

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
            <h1 className="text-2xl font-bold tracking-tight">Companies Overview</h1>
          </div>
          <p className="text-muted-foreground">
            View all companies in the system
          </p>
        </div>
      </div>

      <ViewOnlyCompaniesList />
    </div>
  );
}
