import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Lazy Load Pages
const Login = lazy(() => import("@/pages/Login"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"));
const Guilds = lazy(() => import("@/pages/Guilds"));
const GuildView = lazy(() => import("@/pages/GuildView"));
const GuildMembers = lazy(() => import("@/pages/GuildMembers"));
const GuildSettings = lazy(() => import("@/pages/GuildSettings"));
const Commands = lazy(() => import("@/pages/Commands"));
const BotManagement = lazy(() => import("@/pages/BotManagement"));
const Music = lazy(() => import("@/pages/Music"));
const Profile = lazy(() => import("@/pages/Profile"));
const Overview = lazy(() => import("@/pages/Overview"));
const Settings = lazy(() => import("@/pages/Settings"));
import PrivateRoute from "@/components/PrivateRoute";
import PublicRoute from "@/components/PublicRoute";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const PageLoader = () => (
    <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
);

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <Toaster />
        <Suspense fallback={<PageLoader />}>
            <div className="min-h-screen bg-background text-foreground font-sans antialiased">
                <Routes>
                {/* Public Routes - Redirect to Dashboard if already logged in */}
                <Route element={<PublicRoute />}>
                    <Route path="/" element={<Login />} />
                </Route>
                
                <Route path="/auth/callback" element={<AuthCallback />} />
                
                {/* Protected Dashboard Routes */}
                <Route element={<PrivateRoute />}>
                    <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<Overview />} />
                    <Route path="guilds" element={<Guilds />} />
                    <Route path="guilds/:guildId" element={<GuildView />} />
                    <Route path="guilds/:guildId/members" element={<GuildMembers />} />
                    <Route path="guilds/:guildId/settings" element={<GuildSettings />} />
                    <Route path="commands" element={<Commands />} />
                    <Route path="admin" element={<BotManagement />} />
                    <Route path="overview" element={<Overview />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="music" element={<Music />} />
                    <Route path="music/:guildId" element={<Music />} />
                    <Route path="settings" element={<Settings />} />
                    </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </Suspense>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
