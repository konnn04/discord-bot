import { Outlet, useParams, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAuthStore } from "@/stores/auth.store";
import { useGuildStore } from "@/stores/guild.store";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Bot,
  ChevronLeft,
  UserCog,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";

document.title = "FoxyBot - Admin Dashboard";

export function AdminLayout() {
  const { guildId } = useParams<{ guildId: string }>();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { guilds, fetchGuilds, selectedGuild } = useGuildStore();

  useEffect(() => {
    fetchGuilds();
  }, [fetchGuilds]);

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href?: string }[] = [
      { label: "Admin", href: "/admin" },
    ];

    if (parts.includes("admin") && parts.length > 1) {
      const gId = parts[1];
      const guild = guilds.find((g) => g.id === gId) || selectedGuild;
      if (guild) {
        crumbs.push({
          label: guild.name,
          href: `/admin/${gId}/dashboard`,
        });
      }
    }

    if (parts.includes("dashboard")) {
      crumbs.push({ label: "Tổng quan" });
    } else if (parts.includes("members")) {
      crumbs.push({ label: "Thành viên" });
    } else if (parts.includes("settings")) {
      crumbs.push({ label: "Cài đặt" });
    }

    return crumbs;
  }, [location.pathname, guilds, selectedGuild]);

  return (
    <SidebarProvider
      defaultOpen={!!guildId}
      style={{ "--sidebar-width": "300px" } as React.CSSProperties}
    >
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar collapsible="icon">
          <SidebarHeader className="flex items-center gap-2 p-4">
            <Bot className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate font-bold group-data-[collapsible=icon]:hidden">
              FoxyBot Admin
            </span>
          </SidebarHeader>
          <SidebarContent>
            {guildId ? (
              <>
                <SidebarGroup>
                  <SidebarGroupLabel>Quản lý</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname.includes("/dashboard")}
                        >
                          <Link to={`/admin/${guildId}/dashboard`}>
                            <LayoutDashboard className="h-4 w-4" />
                            <span>Tổng quan</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname.includes("/members")}
                        >
                          <Link to={`/admin/${guildId}/members`}>
                            <Users className="h-4 w-4" />
                            <span>Thành viên</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname.includes("/settings") && !location.pathname.split("/").includes("welcome") && !location.pathname.split("/").includes("notifications") && !location.pathname.split("/").includes("general") && !location.pathname.split("/").includes("michosgc")}
                        >
                          <Link to={`/admin/${guildId}/settings`}>
                            <Settings className="h-4 w-4" />
                            <span>Chung</span>
                          </Link>
                        </SidebarMenuButton>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname.includes("/welcome")}
                            >
                              <Link to={`/admin/${guildId}/settings/welcome`}>
                                Chào mừng
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname.includes("/notifications")}
                            >
                              <Link to={`/admin/${guildId}/settings/notifications`}>
                                Thông báo
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname.includes("/general")}
                            >
                              <Link to={`/admin/${guildId}/settings/general`}>
                                Cài đặt chung
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname.includes("/michosgc")}
                            >
                              <Link to={`/admin/${guildId}/settings/michosgc`}>
                                Game Roles
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                  <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <Link to="/admin">
                            <ChevronLeft className="h-4 w-4" />
                            <span>Chọn server khác</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            ) : (
              <>
                <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
                  Chọn một server để bắt đầu quản lý
                </div>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname === "/admin/settings"}
                        >
                          <Link to="/admin/settings">
                            <UserCog className="h-4 w-4" />
                            <span>Cá nhân hóa</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-14 items-center justify-between border-b px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />

              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, i) => (
                    <BreadcrumbItem key={i}>
                      {i < breadcrumbs.length - 1 && crumb.href ? (
                        <>
                          <BreadcrumbLink asChild>
                            <Link to={crumb.href}>{crumb.label}</Link>
                          </BreadcrumbLink>
                          <BreadcrumbSeparator />
                        </>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={
                          user?.avatar
                            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
                            : undefined
                        }
                      />
                      <AvatarFallback>
                        {user?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user?.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{user?.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin/settings" className="cursor-pointer">
                      <UserCog className="mr-2 h-4 w-4" />
                      Cá nhân hóa
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
