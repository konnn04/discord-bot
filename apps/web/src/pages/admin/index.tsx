import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuildStore } from "@/stores/guild.store";
import {
  Server,
  Clock,
  HardDrive,
  Users,
  ChevronRight,
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

export function AdminPage() {
  const navigate = useNavigate();
  const { guilds, isLoading, fetchGuilds } = useGuildStore();
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    fetchGuilds();
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {
        /* health endpoint not critical */
      });
  }, [fetchGuilds]);

  const managedGuilds = guilds;

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Uptime
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {health
                ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`
                : "--"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              RAM Usage
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health ? health.memory.heapUsed : "--"}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                MB
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng thành viên
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {guilds.reduce((sum, g) => sum + (g.memberCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

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
                      src={
                        guild.icon
                      }
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
