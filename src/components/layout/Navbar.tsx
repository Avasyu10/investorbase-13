
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Building, User, MessageCircle, Shield, LayoutDashboard } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  // Determine if we're on a company or section page
  const isCompanyOrSectionPage = location.pathname.includes('/company/');

  useEffect(() => {
    if (user) {
      // Check if user is admin
      const checkAdminStatus = async () => {
        try {
          console.log('Checking admin status for user:', user.id);
          
          const { data, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error('Error checking admin status:', error);
            throw error;
          }
          
          console.log('Admin status data:', data);
          setIsAdmin(data?.is_admin === true);
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      };
      
      checkAdminStatus();
    }
  }, [user]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg transition-all">
      <div className="container flex h-16 items-center justify-between px-3 sm:px-4 md:px-8">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2 transition-transform hover:scale-[1.01]">
          <img 
            src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" 
            alt="InvestorBase Logo" 
            className="h-8 w-auto" 
          />
        </Link>
        <nav className="flex items-center">
          {user && (
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  className="transition-colors hidden sm:flex"
                >
                  <Link to="/admin-dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Admin
                  </Link>
                </Button>
              )}
              
              {isCompanyOrSectionPage && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  className="transition-colors hidden sm:flex"
                >
                  <Link to="/dashboard">
                    <Building className="h-4 w-4 mr-2" />
                    Companies
                  </Link>
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="transition-colors hidden sm:flex"
              >
                <Link to="/profile">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Link>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="transition-colors hidden sm:flex"
              >
                <Link to="/feedback">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Feedback
                </Link>
              </Button>
              
              {/* Mobile navigation dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="sm:hidden">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin-dashboard" className="flex items-center">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isCompanyOrSectionPage && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center">
                        <Building className="h-4 w-4 mr-2" />
                        Companies
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/feedback" className="flex items-center">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Feedback
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="flex items-center">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Desktop nav items */}
              <span className="text-sm text-muted-foreground hidden md:inline-block">
                {user.email}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="transition-colors hidden sm:flex"
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
