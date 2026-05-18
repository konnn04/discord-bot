import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settings.store";
import { COMMON_TIMEZONES, getTimezoneAbbr } from "@/lib/time";
import { Globe, Clock, RotateCcw } from "lucide-react";

export function UserSettingsPage() {
  const { timezone, locale, setTimezone, setLocale, reset, init } = useSettingsStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cá nhân hóa</h1>
        <p className="mt-1 text-muted-foreground">
          Tùy chỉnh hiển thị theo sở thích của bạn
        </p>
      </div>

      {/* ── Timezone ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Múi giờ
          </CardTitle>
          <CardDescription>
            Thời gian hiển thị trên dashboard sẽ dùng múi giờ này.
            Hiện tại: <strong>{getTimezoneAbbr(timezone)} ({timezone})</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">Chọn múi giờ</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                {new Date().toLocaleString("vi-VN", {
                  timeZone: timezone,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })}
                {" — "}
                {new Date().toLocaleString("vi-VN", {
                  timeZone: timezone,
                  weekday: "short",
                  day: "numeric",
                  month: "numeric",
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Locale ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            Ngôn ngữ & Định dạng
          </CardTitle>
          <CardDescription>
            Định dạng số, ngày tháng sẽ theo locale này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger id="locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi-VN">Tiếng Việt (vi-VN)</SelectItem>
                  <SelectItem value="en-US">English (en-US)</SelectItem>
                  <SelectItem value="en-GB">English (en-GB)</SelectItem>
                  <SelectItem value="ja-JP">日本語 (ja-JP)</SelectItem>
                  <SelectItem value="ko-KR">한국어 (ko-KR)</SelectItem>
                  <SelectItem value="zh-CN">中文 (zh-CN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm">
                {1234567.89.toLocaleString(locale)}
                {" — "}
                {new Date().toLocaleDateString(locale)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Reset ── */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Khôi phục mặc định
        </Button>
      </div>
    </div>
  );
}
