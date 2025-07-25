
import { useProfile } from "@/hooks/useProfile";
import { CompaniesList } from "./CompaniesList";
import { IITBombayCompaniesList } from "./IITBombayCompaniesList";
import { VCAndBitsCompaniesList } from "./VCAndBitsCompaniesList";

export function ConditionalCompaniesList() {
  const { isIITBombay, isVC, isBits, isEximius } = useProfile();
  
  // Check if user is both VC and BITS
  const isVCAndBits = isVC && isBits;
  
  // Check if user is a general user (none of the special flags are true)
  const isGeneralUser = !isIITBombay && !isVC && !isBits && !isEximius;

  if (isIITBombay) {
    return <IITBombayCompaniesList />;
  }
  
  if (isVCAndBits) {
    return <VCAndBitsCompaniesList />;
  }
  
  // Eximius users get the same table format as VC users (regular format)
  // For general users, pass the isGeneralUser flag
  return <CompaniesList isGeneralUser={isGeneralUser} />;
}
