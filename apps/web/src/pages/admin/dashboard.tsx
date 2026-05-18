import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
// import { DISCORD_CDN } from "@/lib/constants";
import type {
  GuildInfo,
  GuildStats,
  MessageChartData,
  XpChartData,
  OnlineFrequencyData,
} from "@/lib/types";
import {
  Users,
  UserCheck,
  Bot,
  Shield,
  Hash,
  CalendarDays,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { format } from "date-fns";

export function DashboardPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [stats, setStats] = useState<GuildStats | null>(null);
  const [messageChart, setMessageChart] = useState<MessageChartData[]>([]);
  const [xpChart, setXpChart] = useState<XpChartData[]>([]);
  const [onlineFreq, setOnlineFreq] = useState<OnlineFrequencyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;

    Promise.all([
      api.get<GuildInfo>(API_ROUTES.GUILD(guildId)),
      api
        .get<GuildStats>(API_ROUTES.GUILD_STATS(guildId))
        .catch(() => null),
      api
        .get<MessageChartData[]>(
          API_ROUTES.GUILD_CHARTS_MESSAGES(guildId),
        )
        .catch(() => [] as MessageChartData[]),
      api
        .get<XpChartData[]>(API_ROUTES.GUILD_CHARTS_XP(guildId))
        .catch(() => [] as XpChartData[]),
      api
        .get<OnlineFrequencyData[]>(
          API_ROUTES.GUILD_CHARTS_ONLINE(guildId),
        )
        .catch(() => [] as OnlineFrequencyData[]),
    ]).then(([g, s, m, x, o]) => {
      setGuild(g);
      setStats(s);
      setMessageChart(m);
      setXpChart(x);
      setOnlineFreq(o);
      setIsLoading(false);
    });
  }, [guildId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Guild Info Header */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <Avatar className="h-20 w-20 rounded-2xl">
            <AvatarImage
              src={
                guild?.icon
              }
            />
            <AvatarFallback className="rounded-2xl text-2xl">
              {guild?.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{guild?.name}</h1>
            {guild?.description && (
              <p className="mt-1 text-muted-foreground">
                {guild.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Tạo{" "}
                {stats?.createdAt
                  ? format(new Date(stats.createdAt), "dd/MM/yyyy")
                  : "N/A"}
              </span>
              <span>ID: {guildId}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Thành viên Online
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.onlineMembers ?? "?"}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {stats?.totalMembers ?? "?"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.botMembers ?? "?"} bot
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Roles
            </CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.roleCount ?? "?"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Channels
            </CardTitle>
            <Hash className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.channelCount ?? "?"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Bot
            </CardTitle>
            <Bot className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.botMembers ?? "?"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Tin nhắn theo tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ count: { label: "Tin nhắn", color: "hsl(var(--primary))" } }}
              className="h-72 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={messageChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* XP Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              XP theo tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ xp: { label: "XP", color: "hsl(var(--chart-2))" } }}
              className="h-72 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={xpChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="xp"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Online Frequency */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Tần suất online theo giờ (UTC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: "Online", color: "hsl(var(--chart-3))" },
              }}
              className="h-72 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={onlineFreq}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="hour"
                    className="text-xs"
                    tickFormatter={(h) => `${h}h`}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--chart-3))"
                    fill="hsl(var(--chart-3) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
