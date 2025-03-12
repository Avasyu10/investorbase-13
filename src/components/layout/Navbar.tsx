
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, FileText, Building } from "lucide-react";

export function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg transition-all">
      <div className="container flex h-16 items-center px-4 sm:px-8">
        <Link to={user ? "/companies" : "/"} className="flex items-center space-x-2 transition-transform hover:scale-[1.01]">
          <Building className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-tight">CompanyScoreTracker</span>
        </Link>
        <nav className="ml-auto flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <Link to="/companies">
                <Button variant="ghost" size="sm" className="transition-colors">
                  <Building className="h-4 w-4 mr-2" />
                  Companies
                </Button>
              </Link>
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
          ) : null}
        </nav>
      </div>
    </header>
  );
}
