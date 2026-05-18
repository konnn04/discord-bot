import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type {
  GuildInfo,
  GuildStats,
  MessageChartData,
  XpChartData,
  OnlineFrequencyData,
  XpTopMember,
  MusicStats,
} from "@/lib/types";
import {
  UserCheck,
  Bot,
  Shield,
  Hash,
  CalendarDays,
  MessageSquare,
  TrendingUp,
  Music,
  Headphones,
  Clock,
  Award,
  Play,
  Disc3,
  BarChart3,
  Activity,
  Crown,
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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatListeningHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} phút`;
  return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
}

export function DashboardPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [stats, setStats] = useState<GuildStats | null>(null);
  const [messageChart, setMessageChart] = useState<MessageChartData[]>([]);
  const [xpChart, setXpChart] = useState<XpChartData[]>([]);
  const [onlineFreq, setOnlineFreq] = useState<OnlineFrequencyData[]>([]);
  const [onlineRange, setOnlineRange] = useState<string>("week");
  const [xpTopMembers, setXpTopMembers] = useState<XpTopMember[]>([]);
  const [xpTopPeriod, setXpTopPeriod] = useState<string>("month");
  const [musicStats, setMusicStats] = useState<MusicStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const year = `${now.getFullYear()}`;

    Promise.all([
      api.get<GuildInfo>(API_ROUTES.GUILD(guildId)),
      api.get<GuildStats>(API_ROUTES.GUILD_STATS(guildId)).catch(() => null),
      api
        .get<MessageChartData[]>(API_ROUTES.GUILD_CHARTS_MESSAGES(guildId))
        .catch(() => [] as MessageChartData[]),
      api
        .get<XpChartData[]>(API_ROUTES.GUILD_CHARTS_XP(guildId))
        .catch(() => [] as XpChartData[]),
      api
        .get<OnlineFrequencyData[]>(
          API_ROUTES.GUILD_CHARTS_ONLINE(guildId, onlineRange),
        )
        .catch(() => [] as OnlineFrequencyData[]),
      api
        .get<{ guildId: string; period: string; members: XpTopMember[] }>(
          `${API_ROUTES.GUILD_CHARTS_XP_TOP(guildId)}?period=${xpTopPeriod === "year" ? year : period}&limit=10`,
        )
        .then((r) => r.members)
        .catch(() => [] as XpTopMember[]),
      api
        .get<MusicStats>(API_ROUTES.GUILD_MUSIC_STATS(guildId))
        .catch(() => null),
    ])
      .then(([g, s, m, x, o, xpTop, ms]) => {
        setGuild(g);
        setStats(s);
        setMessageChart(m);
        setXpChart(x);
        setOnlineFreq(o);
        setXpTopMembers(xpTop);
        setMusicStats(ms);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [guildId, onlineRange, xpTopPeriod]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Guild Info Header ── */}
      <Card className="overflow-hidden border-0 bg-linear-to-br from-primary/5 via-card to-card shadow-sm">
        <CardContent className="flex items-center gap-6 p-6">
          <Avatar className="h-20 w-20 rounded-2xl ring-2 ring-primary/20">
            <AvatarImage src={guild?.icon} />
            <AvatarFallback className="rounded-2xl text-2xl font-bold">
              {guild?.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">
              {guild?.name}
            </h1>
            {guild?.description && (
              <p className="mt-1 text-muted-foreground line-clamp-1">
                {guild.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Tạo{" "}
                {stats?.createdAt
                  ? format(new Date(stats.createdAt), "dd/MM/yyyy")
                  : "N/A"}
              </span>
              <Badge variant="outline" className="font-mono text-xs">
                ID: {guildId}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Thành viên Online
            </CardTitle>
            <div className="rounded-lg bg-green-500/10 p-2">
              <UserCheck className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.onlineMembers ?? "?"}
              <span className="ml-1.5 text-base font-normal text-muted-foreground">
                / {stats?.totalMembers ?? "?"}
              </span>
            </div>
            <Progress
              value={
                stats?.totalMembers
                  ? ((stats.onlineMembers ?? 0) / stats.totalMembers) * 100
                  : 0
              }
              className="mt-2 h-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {stats?.botMembers ?? "?"} bot •{" "}
              {stats?.totalMembers
                ? Math.round(
                    ((stats.onlineMembers ?? 0) / stats.totalMembers) * 100,
                  )
                : 0}
              % online
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Roles
            </CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Shield className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.roleCount ?? "?"}</div>
            <p className="mt-1 text-xs text-muted-foreground">Phân quyền</p>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Channels
            </CardTitle>
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Hash className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.channelCount ?? "?"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Kênh văn bản & voice
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bot
            </CardTitle>
            <div className="rounded-lg bg-orange-500/10 p-2">
              <Bot className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.botMembers ?? "?"}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Trong tổng {stats?.totalMembers ?? "?"} thành viên
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 1: Messages & XP ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Chart */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              Tin nhắn theo tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Tin nhắn",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-72 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={messageChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/50"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tickFormatter={(m) => {
                      const [, month] = m.split("-");
                      return `T${parseInt(month)}`;
                    }}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* XP Chart */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-chart-2" />
              XP theo tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                xp: { label: "XP", color: "hsl(var(--chart-2))" },
              }}
              className="h-72 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={xpChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/50"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tickFormatter={(m) => {
                      const [, month] = m.split("-");
                      return `T${parseInt(month)}`;
                    }}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="xp"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--chart-2))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: XP Top 10 + Online Frequency ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* XP Top 10 */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-yellow-500" />
              Top 10 XP
            </CardTitle>
            <Tabs
              value={xpTopPeriod}
              onValueChange={setXpTopPeriod}
              className="shrink-0"
            >
              <TabsList className="h-8">
                <TabsTrigger value="month" className="px-2.5 text-xs">
                  Tháng
                </TabsTrigger>
                <TabsTrigger value="year" className="px-2.5 text-xs">
                  Năm
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              {xpTopPeriod === "year"
                ? `Năm ${new Date().getFullYear()}`
                : `Tháng ${new Date().getMonth() + 1}, ${new Date().getFullYear()}`}
            </p>
            {xpTopMembers.length === 0 ? (
              <div className="flex h-52 flex-col items-center justify-center text-center text-muted-foreground">
                <Award className="mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">Chưa có dữ liệu XP</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {xpTopMembers.map((member, index) => {
                  const maxXp = xpTopMembers[0]?.xp || 1;
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          index === 0
                            ? "bg-yellow-500/20 text-yellow-500"
                            : index === 1
                              ? "bg-gray-400/20 text-gray-400"
                              : index === 2
                                ? "bg-amber-700/20 text-amber-700"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {member.rank}
                      </span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {member.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {member.username}
                      </span>
                      <div className="flex w-28 items-center gap-2">
                        <Progress
                          value={(member.xp / maxXp) * 100}
                          className="h-2"
                        />
                      </div>
                      <span className="w-20 text-right text-sm font-semibold tabular-nums">
                        {member.xp.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Online Frequency */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-chart-3" />
              Online theo giờ
            </CardTitle>
            <Tabs
              value={onlineRange}
              onValueChange={setOnlineRange}
              className="shrink-0"
            >
              <TabsList className="h-8">
                <TabsTrigger value="week" className="px-2.5 text-xs">
                  Tuần
                </TabsTrigger>
                <TabsTrigger value="month" className="px-2.5 text-xs">
                  Tháng
                </TabsTrigger>
                <TabsTrigger value="90d" className="px-2.5 text-xs">
                  90 Ngày
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Lượng thành viên online trung bình theo khung giờ (UTC)
              {onlineFreq.every((d) => d.count === 0) &&
                " — Chưa có dữ liệu, cron đang thu thập..."}
            </p>
            <ChartContainer
              config={{
                count: {
                  label: "Online TB",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-52 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={onlineFreq}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/50"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="hour"
                    className="text-xs"
                    tickFormatter={(h) => `${h}h`}
                    interval={2}
                  />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(h) => `${h}:00 - ${h}:59`}
                  />
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

      {/* ── Music Section ── */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Music className="h-5 w-5 text-primary" />
          Âm nhạc
          {musicStats?.currentlyPlaying && (
            <Badge variant="secondary" className="ml-2 animate-pulse text-xs">
              <Play className="mr-1 h-3 w-3" /> Đang phát
            </Badge>
          )}
        </h2>

        {!musicStats ||
        (musicStats.totalTracksPlayed === 0 &&
          !musicStats.currentlyPlaying) ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Disc3 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Chưa có dữ liệu âm nhạc</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Lịch sử nghe nhạc sẽ được hiển thị khi có thành viên nghe nhạc
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Currently Playing */}
            {musicStats.currentlyPlaying && (
              <Card className="overflow-hidden border-0 bg-linear-to-br from-primary/5 via-card to-card shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="relative shrink-0">
                    <img
                      src={musicStats.currentlyPlaying.thumbnail}
                      alt={musicStats.currentlyPlaying.title}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">ĐANG PHÁT</p>
                    <p className="truncate font-semibold">
                      {musicStats.currentlyPlaying.title}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {musicStats.currentlyPlaying.artist}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {musicStats.currentlyPlaying.requestedBy}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng bài hát
                  </CardTitle>
                  <Disc3 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {musicStats?.totalTracksPlayed.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Giờ nghe
                  </CardTitle>
                  <Clock className="h-4 w-4 text-chart-2" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatListeningHours(
                      musicStats?.totalListeningHours ?? 0,
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Người nghe
                  </CardTitle>
                  <Headphones className="h-4 w-4 text-chart-3" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {musicStats?.topListeners.length ?? 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Listeners & Top Tracks */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top Listeners */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Headphones className="h-4 w-4 text-chart-4" />
                    Top người nghe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {musicStats?.topListeners.map((listener, index) => (
                      <div
                        key={listener.discordId}
                        className="flex items-center gap-3"
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            index === 0
                              ? "bg-yellow-500/20 text-yellow-500"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={listener.avatarUrl ?? undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {listener.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {listener.username}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {listener.trackCount} bài
                        </span>
                        <span className="w-16 text-right text-xs font-medium text-muted-foreground">
                          {formatDuration(listener.totalSeconds)}
                        </span>
                      </div>
                    ))}
                    {(!musicStats?.topListeners ||
                      musicStats.topListeners.length === 0) && (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Chưa có dữ liệu
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Tracks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-chart-5" />
                    Top bài hát
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {musicStats?.topTracks.map((track, index) => {
                      const maxPlayCount =
                        musicStats.topTracks[0]?.playCount || 1;
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {track.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {track.artist}
                            </p>
                          </div>
                          <div className="flex w-24 items-center gap-2">
                            <Progress
                              value={
                                (track.playCount / maxPlayCount) * 100
                              }
                              className="h-1.5"
                            />
                          </div>
                          <span className="w-16 text-right text-xs font-medium text-muted-foreground">
                            {track.playCount} lần
                          </span>
                        </div>
                      );
                    })}
                    {(!musicStats?.topTracks ||
                      musicStats.topTracks.length === 0) && (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Chưa có dữ liệu
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Separator />
      <p className="text-center text-xs text-muted-foreground">
        Dữ liệu được cập nhật theo thời gian thực • Lần cuối:{" "}
        {format(new Date(), "HH:mm:ss")}
      </p>
    </div>
  );
}
