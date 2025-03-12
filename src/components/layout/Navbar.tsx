
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, FileText, Building } from "lucide-react";

export function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  // Determine if we're on a company or section page
  const isCompanyOrSectionPage = location.pathname.includes('/company/');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg transition-all">
      <div className="container flex h-16 items-center px-4 sm:px-8">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2 transition-transform hover:scale-[1.01]">
          <FileText className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-tight">InvestorBase</span>
        </Link>
        <nav className="ml-auto flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-4">
              {isCompanyOrSectionPage && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  className="transition-colors"
                >
                  <Link to="/dashboard">
                    <Building className="h-4 w-4 mr-2" />
                    Companies
                  </Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {user.email}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
