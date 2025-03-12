
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, FileText } from "lucide-react";

export function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg transition-all">
      <div className="container flex h-16 items-center px-4 sm:px-8">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2 transition-transform hover:scale-[1.01]">
          <FileText className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-tight">Reports Viewer</span>
        </Link>
        <nav className="ml-auto flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
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
          ) : (
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm" className="transition-colors">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="transition-all duration-200 hover:shadow-md">
                <Link to="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
