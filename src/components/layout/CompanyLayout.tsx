
import { Outlet, useLocation } from "react-router-dom";
import { CompanySidebar } from "./CompanySidebar";

export function CompanyLayout() {
  const location = useLocation();
  const isCompanyRoute = location.pathname.includes('/companies');

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {isCompanyRoute && <CompanySidebar />}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
