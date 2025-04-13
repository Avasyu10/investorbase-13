
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface NavLink {
  name: string;
  href: string;
}

const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userNavLinks, setUserNavLinks] = useState<NavLink[]>([
    { name: 'Dashboard', href: '/dashboard' },
  ]);

  useEffect(() => {
    // Reset the nav links when the user logs in or logs out
    setUserNavLinks([{ name: 'Dashboard', href: '/dashboard' }]);

    // Check if user is admin
    const checkAdminStatus = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (data?.is_admin) {
          setUserNavLinks((prev) => [
            ...prev,
            { name: 'Admin Dashboard', href: '/admin-dashboard' },
          ]);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="fixed top-0 left-0 w-full bg-background z-50 border-b">
      <div className="container flex items-center justify-between h-16">
        <Link to="/dashboard" className="font-bold text-2xl">
          InvestorBase
        </Link>

        {/* Mobile Menu Button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:w-64">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>
                Navigate through InvestorBase
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              {userNavLinks.map((link) => (
                <Button
                  key={link.name}
                  variant={isActive(link.href) ? "secondary" : "ghost"}
                  onClick={() => {
                    navigate(link.href);
                    setIsMenuOpen(false);
                  }}
                  className="justify-start"
                >
                  {link.name}
                </Button>
              ))}
              <Button
                variant="ghost"
                onClick={signOut}
                className="justify-start"
              >
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative w-8 h-8 rounded-full">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile/edit")}>
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {userNavLinks.map((link) => (
                  <DropdownMenuItem key={link.name} onClick={() => navigate(link.href)}>
                    {link.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/signup" className="text-sm font-medium hover:underline">
                Sign Up
              </Link>
              <Link to="/" className="text-sm font-medium hover:underline">
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export { Navbar };
