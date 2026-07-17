import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { MeetingReport } from "shared/src/types/api.types";
import { Users, Clock, CalendarClock, Hash, AlertCircle } from "lucide-react";

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MeetingReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<MeetingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .get<MeetingReport>(API_ROUTES.MEETING_REPORT(id))
      .then((r) => active && (setReport(r), setLoading(false)))
      .catch(() => active && (setError(true), setLoading(false)));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertCircle className="h-10 w-10" />
        <p>Không tìm thấy báo cáo cuộc họp này.</p>
      </div>
    );
  }

  const participants = [...report.participants].sort(
    (a, b) => b.totalDuration - a.totalDuration,
  );
  const total = participants.length;
  const avg =
    total > 0
      ? participants.reduce((s, p) => s + p.totalDuration, 0) / total
      : 0;
  const maxDuration = participants[0]?.totalDuration || 1;
  const meetingLength =
    new Date(report.endTime).getTime() - new Date(report.startTime).getTime();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Hash className="h-4 w-4" />
          <span className="text-sm">Báo cáo điểm danh cuộc họp</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {report.channelName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date(report.startTime).toLocaleString("vi-VN")} →{" "}
          {new Date(report.endTime).toLocaleString("vi-VN")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Người tham gia" value={String(total)} />
        <StatCard
          icon={CalendarClock}
          label="Độ dài cuộc họp"
          value={formatDuration(meetingLength)}
        />
        <StatCard
          icon={Clock}
          label="Thời gian TB / người"
          value={formatDuration(avg)}
        />
      </div>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách tham gia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {participants.map((p, i) => (
            <div key={p.userId} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.displayName}
                  <span className="ml-2 text-xs text-muted-foreground">
                    @{p.tag}
                  </span>
                </span>
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {formatDuration(p.totalDuration)}
                </Badge>
              </div>
              <Progress
                value={(p.totalDuration / maxDuration) * 100}
                className="h-1.5"
              />
              {p.sessions.length > 1 && (
                <div className="pl-9 text-xs text-muted-foreground">
                  {p.sessions.map((s, idx) => (
                    <span key={idx} className="mr-3 inline-block">
                      {formatTime(s.joinedAt)} →{" "}
                      {s.leftAt ? formatTime(s.leftAt) : "…"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {total === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Không có người tham gia nào được ghi nhận.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Được tạo bởi FoxyBot
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
