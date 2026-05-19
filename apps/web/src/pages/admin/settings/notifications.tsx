import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { GuildSettings } from "shared/src/types/settings.types";
import { Brain, Gift, Trophy, MicVocal, ArrowUp } from "lucide-react";

type Ctx = { data: GuildSettings; setData: (d: GuildSettings) => void; guildId: string };

export function NotificationsSettings() {
  const { data, setData, guildId } = useOutletContext<Ctx>();

  const update = (partial: Partial<GuildSettings>) => {
    const next = { ...data, ...partial };
    setData(next);
    api.put(API_ROUTES.GUILD_SETTINGS(guildId), partial).catch(() => {
      toast.error("Lưu thất bại");
    });
  };

  return (
    <div className="space-y-6">
      {/* LeetCode Daily */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-chart-2" />
            LeetCode Daily
          </CardTitle>
          <CardDescription>
            Gửi bài tập LeetCode mỗi ngày
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="leetcode-enabled">Bật LeetCode Daily</Label>
            <Switch
              id="leetcode-enabled"
              checked={data.features.dailyLeetCode}
              onCheckedChange={(v) =>
                update({ features: { ...data.features, dailyLeetCode: v } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leetcode-channel">Kênh gửi</Label>
            <Input
              id="leetcode-channel"
              placeholder="Channel ID..."
              value={data.dailyLeetCode.channelId ?? ""}
              onChange={(e) =>
                update({
                  dailyLeetCode: { channelId: e.target.value || null },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* LeetCode Contest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-chart-4" />
            LeetCode Contest
          </CardTitle>
          <CardDescription>
            Thông báo cuộc thi LeetCode sắp diễn ra
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="contest-enabled">Bật LeetCode Contest</Label>
            <Switch
              id="contest-enabled"
              checked={data.features.leetcodeContest}
              onCheckedChange={(v) =>
                update({ features: { ...data.features, leetcodeContest: v } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contest-channel">Kênh gửi</Label>
            <Input
              id="contest-channel"
              placeholder="Channel ID..."
              value={data.leetcodeContest.channelId ?? ""}
              onChange={(e) =>
                update({
                  leetcodeContest: { channelId: e.target.value || null },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Michosgc - Giftcode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-chart-3" />
            Giftcode Game
          </CardTitle>
          <CardDescription>
            Tự động kiểm tra và thông báo giftcode game
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="michosgc-enabled">Bật giftcode</Label>
            <Switch
              id="michosgc-enabled"
              checked={data.michosgc.enabled}
              onCheckedChange={(v) =>
                update({ michosgc: { ...data.michosgc, enabled: v } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="michosgc-channel">Kênh gửi</Label>
            <Input
              id="michosgc-channel"
              placeholder="Channel ID..."
              value={data.michosgc.channelId ?? ""}
              onChange={(e) =>
                update({ michosgc: { ...data.michosgc, channelId: e.target.value || null } })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Level Up */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-chart-5" />
            Level Up
          </CardTitle>
          <CardDescription>
            Thông báo khi thành viên lên level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="lvlup-enabled">Bật thông báo level up</Label>
            <Switch
              id="lvlup-enabled"
              checked={data.xp.levelUpNotification}
              onCheckedChange={(v) =>
                update({ xp: { ...data.xp, levelUpNotification: v } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lvlup-channel">Kênh gửi</Label>
            <Input
              id="lvlup-channel"
              placeholder="Channel ID..."
              value={data.xp.levelUpChannelId ?? ""}
              onChange={(e) =>
                update({ xp: { ...data.xp, levelUpChannelId: e.target.value || null } })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Voice Welcome */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MicVocal className="h-4 w-4 text-chart-1" />
            Voice Welcome
          </CardTitle>
          <CardDescription>
            Chào mừng khi thành viên vào kênh voice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="voice-welcome">Bật voice welcome</Label>
            <Switch
              id="voice-welcome"
              checked={data.features.voiceWelcome}
              onCheckedChange={(v) =>
                update({ features: { ...data.features, voiceWelcome: v } })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
