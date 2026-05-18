import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useGuildStore } from "@/stores/guild.store";
import { useSettingsStore } from "@/stores/settings.store";
import { formatInTimezone } from "@/lib/time";
import {
  Server,
  Clock,
  HardDrive,
  Users,
  ChevronRight,
  Activity,
  Music,
  Database,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface HealthData {
  ok: boolean;
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
}

interface FullHealthResponse {
  success: boolean;
  data: {
    api: {
      ok: boolean;
      uptime: number;
      memory: { rss: number; heapUsed: number; heapTotal: number };
      timestamp: string;
    };
    database: {
      ok: boolean;
      configured: boolean;
    };
    musicServer: {
      ok: boolean;
      status?: string;
      uptime?: number;
      memory?: { rss: number; heapUsed: number; heapTotal: number; external?: number; arrayBuffers?: number };
      timestamp?: string;
      latency?: number;
    };
  };
}

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function AdminPage() {
  const navigate = useNavigate();
  const { guilds, isLoading, fetchGuilds } = useGuildStore();
  const { init: initSettings } = useSettingsStore();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [fullHealth, setFullHealth] = useState<FullHealthResponse['data'] | null>(null);

  useEffect(() => {
    initSettings();
  }, [initSettings]);

  useEffect(() => {
    fetchGuilds();

    // Fetch full system health
    fetch("/api/health/full")
      .then((r) => r.json())
      .then((data: FullHealthResponse) => {
        if (data.success) {
          setFullHealth(data.data);
          setHealth(data.data.api);
        }
      })
      .catch(() => {
        /* health endpoint not critical, fallback to basic health */
        fetch("/api/health")
          .then((r) => r.json())
          .then(setHealth)
          .catch(() => { /* ignore */ });
      });
  }, [fetchGuilds]);

  const managedGuilds = guilds;
  const totalMembers = guilds.reduce((sum, g) => sum + (g.memberCount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Section: System Health */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5 text-primary" />
          Hệ thống
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Server quản lý
              </CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{managedGuilds.length}</div>
              <p className="text-xs text-muted-foreground">
                {totalMembers.toLocaleString()} thành viên
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                API Uptime
              </CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {health ? formatDuration(health.uptime) : "--"}
              </div>
              <p className="text-xs text-muted-foreground">
                {health ? formatInTimezone(health.timestamp) : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                API RAM
              </CardTitle>
              <HardDrive className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {health ? `${health.memory.heapUsed} MB` : "--"}
              </div>
              <p className="text-xs text-muted-foreground">
                Heap: {health ? `${health.memory.heapTotal} MB` : "--"} | RSS:{" "}
                {health ? `${health.memory.rss} MB` : "--"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Database
              </CardTitle>
              {fullHealth?.database?.ok ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : fullHealth === null ? (
                <Database className="h-4 w-4 text-muted-foreground" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    fullHealth?.database?.ok ? "bg-green-500" : fullHealth === null ? "bg-yellow-500" : "bg-red-500"
                  }`}
                />
                <span className="text-lg font-semibold">
                  {fullHealth?.database?.ok ? "Connected" : fullHealth === null ? "Checking..." : "Disconnected"}
                </span>
              </div>
              {fullHealth?.database?.configured !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {fullHealth.database.configured ? "Configured" : "Not configured"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section: Music Server */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Music className="h-5 w-5 text-primary" />
          Music Server
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
              {fullHealth?.musicServer?.status === "healthy" ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : fullHealth?.musicServer?.ok === false ? (
                <WifiOff className="h-4 w-4 text-red-500" />
              ) : (
                <Music className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    fullHealth?.musicServer?.status === "healthy"
                      ? "bg-green-500"
                      : fullHealth?.musicServer?.ok === false
                        ? "bg-red-500"
                        : "bg-yellow-500"
                  }`}
                />
                <span className="text-lg font-semibold">
                  {fullHealth?.musicServer?.status === "healthy"
                    ? "Healthy"
                    : fullHealth?.musicServer?.ok === false
                      ? "Offline"
                      : "Checking..."}
                </span>
              </div>
              {fullHealth?.musicServer?.timestamp && (
                <p className="text-xs text-muted-foreground">
                  {formatInTimezone(fullHealth.musicServer.timestamp)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Music Uptime
              </CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {fullHealth?.musicServer?.uptime
                  ? formatDuration(fullHealth.musicServer.uptime)
                  : "--"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Music RAM
              </CardTitle>
              <HardDrive className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fullHealth?.musicServer?.memory
                  ? formatBytes(fullHealth.musicServer.memory.heapUsed)
                  : "--"}
              </div>
              <p className="text-xs text-muted-foreground">
                RSS:{" "}
                {fullHealth?.musicServer?.memory
                  ? formatBytes(fullHealth.musicServer.memory.rss)
                  : "--"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                API Latency
              </CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fullHealth?.musicServer?.latency ? `${fullHealth.musicServer.latency}ms` : "--"}
              </div>
              <p className="text-xs text-muted-foreground">Music server ping</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Server Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Server của bạn</h2>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : managedGuilds.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Server className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Chưa có server nào</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Bạn cần quyền Quản lý Server để quản lý. Hãy mời bot vào server
                của bạn.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {managedGuilds.map((guild) => (
              <Card
                key={guild.id}
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                onClick={() => navigate(`/admin/${guild.id}/dashboard`)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12 rounded-xl">
                    <AvatarImage
                      src={guild.icon}
                    />
                    <AvatarFallback className="rounded-xl text-lg">
                      {guild.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{guild.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{guild.memberCount || "?"} thành viên</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
