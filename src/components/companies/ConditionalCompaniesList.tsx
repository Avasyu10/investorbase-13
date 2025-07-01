
import { CompaniesList } from "./CompaniesList";
import { IITBombayCompaniesList } from "./IITBombayCompaniesList";
import { VCAndBitsCompaniesList } from "./VCAndBitsCompaniesList";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, Building2 } from "lucide-react";

export function ConditionalCompaniesList() {
  const { profile, isLoading, error, isIITBombay, isVCAndBits } = useProfile();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Failed to Load Profile</h3>
          <p className="mt-2 text-muted-foreground">
            Unable to determine user permissions. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  // Show VC & BITS specific UI if user has both is_vc: true and is_bits: true
  if (isVCAndBits) {
    return <VCAndBitsCompaniesList />;
  }

  // Show IIT Bombay specific UI if user has is_iitbombay: true
  if (isIITBombay) {
    return <IITBombayCompaniesList />;
  }

  // Show default UI for all other users
  return <CompaniesList />;
}
