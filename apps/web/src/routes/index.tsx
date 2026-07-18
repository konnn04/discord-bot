/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AuthGuard } from "@/components/auth-guard";
import { LandingLayout } from "@/components/layout/landing-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

const LoginPage = lazy(() => import("@/pages/login").then(m => ({ default: m.LoginPage })));
const CallbackPage = lazy(() => import("@/pages/callback").then(m => ({ default: m.CallbackPage })));
const LandingPage = lazy(() => import("@/pages/landing").then(m => ({ default: m.LandingPage })));
const MeetingReportPage = lazy(() => import("@/pages/meeting-report").then(m => ({ default: m.MeetingReportPage })));
const AdminLayout = lazy(() => import("@/components/layout/admin-layout").then(m => ({ default: m.AdminLayout })));
const AdminPage = lazy(() => import("@/pages/admin/index").then(m => ({ default: m.AdminPage })));
const DashboardPage = lazy(() => import("@/pages/admin/dashboard").then(m => ({ default: m.DashboardPage })));
const MembersPage = lazy(() => import("@/pages/admin/members").then(m => ({ default: m.MembersPage })));
const UserSettingsPage = lazy(() => import("@/pages/admin/settings").then(m => ({ default: m.UserSettingsPage })));
const GuildSettingsLayout = lazy(() => import("@/pages/admin/settings/layout").then(m => ({ default: m.GuildSettingsLayout })));
const WelcomeSettings = lazy(() => import("@/pages/admin/settings/welcome").then(m => ({ default: m.WelcomeSettings })));
const NotificationsSettings = lazy(() => import("@/pages/admin/settings/notifications").then(m => ({ default: m.NotificationsSettings })));
const GeneralSettings = lazy(() => import("@/pages/admin/settings/general").then(m => ({ default: m.GeneralSettings })));
const GiftcodeSettings = lazy(() => import("@/pages/admin/settings/giftcode").then(m => ({ default: m.GiftcodeSettings })));
const RoleRankSettings = lazy(() => import("@/pages/admin/settings/rolerank").then(m => ({ default: m.RoleRankSettings })));
const ChatbotSettings = lazy(() => import("@/pages/admin/settings/chatbot").then(m => ({ default: m.ChatbotSettings })));
const MusicLayout = lazy(() => import("@/components/layout/music-layout").then(m => ({ default: m.MusicLayout })));
const MusicSelectPage = lazy(() => import("@/pages/music-select").then(m => ({ default: m.MusicSelectPage })));
const MusicPage = lazy(() => import("@/pages/music").then(m => ({ default: m.MusicPage })));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={
    <div className="flex h-screen items-center justify-center">
      <LoadingSpinner />
    </div>
  }>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingLayout />,
    children: [{ index: true, element: <Lazy><LandingPage /></Lazy> }],
  },
  {
    path: "/login",
    element: <Lazy><LoginPage /></Lazy>,
  },
  {
    path: "/callback",
    element: <Lazy><CallbackPage /></Lazy>,
  },
  {
    path: "/meetings/:id",
    element: <Lazy><MeetingReportPage /></Lazy>,
  },
  {
    path: "/admin",
    element: (
      <AuthGuard>
        <Lazy><AdminLayout /></Lazy>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Lazy><AdminPage /></Lazy> },
      {
        path: "settings",
        element: <Lazy><UserSettingsPage /></Lazy>,
      },
      {
        path: ":guildId/dashboard",
        element: <Lazy><DashboardPage /></Lazy>,
      },
      {
        path: ":guildId/members",
        element: <Lazy><MembersPage /></Lazy>,
      },
      {
        path: ":guildId/settings",
        element: <Lazy><GuildSettingsLayout /></Lazy>,
        children: [
          { index: true, element: <Lazy><WelcomeSettings /></Lazy> },
          { path: "welcome", element: <Lazy><WelcomeSettings /></Lazy> },
          { path: "notifications", element: <Lazy><NotificationsSettings /></Lazy> },
          { path: "general", element: <Lazy><GeneralSettings /></Lazy> },
          { path: "giftcode", element: <Lazy><GiftcodeSettings /></Lazy> },
          { path: "rolerank", element: <Lazy><RoleRankSettings /></Lazy> },
          { path: "chatbot", element: <Lazy><ChatbotSettings /></Lazy> },
        ],
      },
    ],
  },
  {
    path: "/music",
    element: (
      <AuthGuard>
        <Lazy><MusicLayout /></Lazy>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Lazy><MusicSelectPage /></Lazy> },
      {
        path: ":guildId",
        element: <Lazy><MusicPage /></Lazy>,
      },
    ],
  },
]);
