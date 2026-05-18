import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Music, Bot } from "lucide-react";

document.title = "FoxyBot - Dashboard quản lý bot Discord của bạn";

export function LandingLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold"
          >
            <Bot className="h-8 w-8 text-primary" />
            <span>FoxyBot</span>
          </Link>

          <NavigationMenu>
            <NavigationMenuList className="gap-2">
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <a href="#features">Tính năng</a>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <a href="#source">Mã nguồn</a>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" asChild>
              <Link to="/music">
                <Music className="mr-2 h-4 w-4" />
                Music
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin">Quản trị</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
