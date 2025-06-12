
import { AlertsSection } from "./AlertsSection";
import { IITBombayAlertsSection } from "./IITBombayAlertsSection";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, AlertCircle } from "lucide-react";

export const ConditionalAlertsSection = () => {
  const { profile, isLoading, error, isIITBombay } = useProfile();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Failed to Load Profile</h3>
        <p className="mt-2 text-muted-foreground">
          Unable to determine user permissions. Please try refreshing the page.
        </p>
      </div>
    );
  }

  // Show IIT Bombay specific alerts UI if user has is_iitbombay: true
  if (isIITBombay) {
    return <IITBombayAlertsSection />;
  }

  // Show default alerts UI for all other users
  return <AlertsSection />;
};
