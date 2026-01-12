import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Music,
  Settings,
  Users,
  LogOut,
  Menu,
  Terminal,
  ShieldAlert
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import type { User } from "@shared/types/api.types";
const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/music", label: "Music", icon: Music },
  { href: "/dashboard/guilds", label: "Guilds", icon: Users },
  { href: "/dashboard/commands", label: "Commands", icon: Terminal },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const adminNavItem = { href: "/dashboard/admin", label: "Bot Management", icon: ShieldAlert };

const SidebarContent = ({ currentPath, onLogout, user }: { currentPath: string, onLogout: () => void, user: User | null }) => (
  <div className="flex h-full flex-col">
    <div className="flex h-14 items-center border-b px-6 gap-2">
      <img src="/logo.png" alt="MPClub Bot" className="h-6 w-6" />
      <span className="font-bold">MPClub Bot</span>
    </div>
    <div className="flex-1 overflow-auto py-4">
      <nav className="grid items-start px-4 text-sm font-medium">
        {navItems.map((item) => {
            if (item.label === 'Settings' && !user?.isDeveloper) return null;
            return (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
              currentPath === item.href
                ? "bg-muted text-primary"
                : "text-muted-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        )})}
        {user?.isDeveloper && (
             <Link
             to={adminNavItem.href}
             className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
               currentPath === adminNavItem.href
                 ? "bg-muted text-destructive"
                 : "text-muted-foreground"
             }`}
           >
             <adminNavItem.icon className="h-4 w-4" />
             {adminNavItem.label}
           </Link>
        )}
      </nav>
    </div>
    <div className="border-t p-4">
      <Button variant="ghost" className="w-full justify-start gap-2" onClick={onLogout}>
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  </div>
);

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await api.fetch<User>("/auth/me");
        setUser(userData);
      } catch (e) {
        console.error("Failed to fetch user", e);
        // Optional: redirect to login if explicitly failed? 
        // api.fetch handles 401 redirect, so we might just stay here or show skeleton
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-muted/40 md:block">
        <SidebarContent currentPath={location.pathname} onLogout={handleLogout} user={user} />
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        {/* Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px]">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
               <SidebarContent currentPath={location.pathname} onLogout={handleLogout} user={user} />
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
             <h1 className="text-lg font-semibold md:text-xl">
                {navItems.find(i => i.href === location.pathname)?.label || 'Dashboard'}
             </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium hidden md:block">
                {user?.username || '...'}
            </span>
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://cdn.discordapp.com/avatars/${user?.id}/${user?.avatar}.png`} alt={user?.username || "@user"} />
                    <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase() || "ME"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
