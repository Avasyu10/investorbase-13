
import { Routes, Route } from "react-router-dom";
import SupplementaryMaterials from "@/pages/SupplementaryMaterials";

// This is a helper function to add routes that can't be added in App.tsx
export function AdditionalRoutes() {
  return (
    <Routes>
      <Route path="/company/:companyId/supplementary" element={<SupplementaryMaterials />} />
    </Routes>
  );
}
