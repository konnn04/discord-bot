import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { GuildChannelSelect } from "@/components/shared/guild-selects";
import { GuildMultiSelect } from "@/components/shared/guild-multi-select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { GuildSettings } from "shared/src/types/settings.types";
import { Hash, HashIcon, Activity, Music, ShieldCheck, Users } from "lucide-react";

type Ctx = { data: GuildSettings; setData: (d: GuildSettings) => void; guildId: string };

export function GeneralSettings() {
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
      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HashIcon className="h-4 w-4 text-primary" />
            Tính năng
          </CardTitle>
          <CardDescription>Bật/tắt các tính năng chính của bot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="feat-xp">XP Tracking</Label>
            <Switch
              id="feat-xp"
              checked={data.features.xpTracking}
              onCheckedChange={(v) =>
                update({ features: { ...data.features, xpTracking: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="feat-meeting">Theo dõi Meeting</Label>
            <Switch
              id="feat-meeting"
              checked={data.features.meetingTracking}
              onCheckedChange={(v) =>
                update({ features: { ...data.features, meetingTracking: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="feat-mod">Moderation</Label>
            <Switch
              id="feat-mod"
              checked={data.features.moderation}
              onCheckedChange={(v) =>
                update({ features: { ...data.features, moderation: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="feat-tag-voice">Tag trong voice</Label>
            <Switch
              id="feat-tag-voice"
              checked={data.features.tagMembersInVoice}
              onCheckedChange={(v) =>
                update({ features: { ...data.features, tagMembersInVoice: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="feat-rank">Rank API (public)</Label>
            <Switch
              id="feat-rank"
              checked={data.rankApi.enabled}
              onCheckedChange={(v) =>
                update({ rankApi: { enabled: v } })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Prefix & Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            Cơ bản
          </CardTitle>
          <CardDescription>Prefix và ngôn ngữ</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="prefix">Prefix</Label>
            <Input
              id="prefix"
              maxLength={5}
              value={data.prefix}
              onChange={(e) => update({ prefix: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lang">Ngôn ngữ</Label>
            <Select value={data.language} onValueChange={(v) => update({ language: v })}>
              <SelectTrigger id="lang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vi">Tiếng Việt</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* XP Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-chart-2" />
            XP
          </CardTitle>
          <CardDescription>Cấu hình hệ thống XP</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="xp-msg">XP mỗi tin nhắn</Label>
            <Input
              id="xp-msg"
              type="number"
              min={1}
              max={100}
              value={data.xp.xpPerMessage}
              onChange={(e) =>
                update({ xp: { ...data.xp, xpPerMessage: parseInt(e.target.value) || 15 } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="xp-voice">XP mỗi phút voice</Label>
            <Input
              id="xp-voice"
              type="number"
              min={1}
              max={100}
              value={data.xp.xpPerVoiceMinute}
              onChange={(e) =>
                update({ xp: { ...data.xp, xpPerVoiceMinute: parseInt(e.target.value) || 10 } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="xp-cooldown">Cooldown (giây)</Label>
            <Input
              id="xp-cooldown"
              type="number"
              min={1}
              max={3600}
              value={data.xp.messageCooldown}
              onChange={(e) =>
                update({ xp: { ...data.xp, messageCooldown: parseInt(e.target.value) || 60 } })
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Kênh bỏ qua XP</Label>
            <GuildMultiSelect
              guildId={guildId}
              kind="channel"
              values={data.xp.ignoredChannels}
              onChange={(ignoredChannels) =>
                update({ xp: { ...data.xp, ignoredChannels } })
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Role bỏ qua XP</Label>
            <GuildMultiSelect
              guildId={guildId}
              kind="role"
              values={data.xp.ignoredRoles}
              onChange={(ignoredRoles) =>
                update({ xp: { ...data.xp, ignoredRoles } })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Music */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-4 w-4 text-chart-3" />
            Nhạc
          </CardTitle>
          <CardDescription>Cấu hình nhạc</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="music-vol">Âm lượng mặc định (%)</Label>
            <Input
              id="music-vol"
              type="number"
              min={1}
              max={100}
              value={data.music.defaultVolume}
              onChange={(e) =>
                update({ music: { ...data.music, defaultVolume: parseInt(e.target.value) || 80 } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="music-timeout">Tự động rời (giây)</Label>
            <Input
              id="music-timeout"
              type="number"
              min={10}
              max={3600}
              value={data.music.autoLeaveTimeout}
              onChange={(e) =>
                update({ music: { ...data.music, autoLeaveTimeout: parseInt(e.target.value) || 120 } })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Moderation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-chart-4" />
            Kiểm duyệt
          </CardTitle>
          <CardDescription>Kênh log</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Kênh log</Label>
            <GuildChannelSelect
              guildId={guildId}
              value={data.moderation.logChannelId}
              onChange={(logChannelId) =>
                update({ moderation: { logChannelId } })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-chart-1" />
            Voice
          </CardTitle>
          <CardDescription>AFK timeout</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="voice-timeout">Timeout (giây)</Label>
            <Input
              id="voice-timeout"
              type="number"
              min={30}
              max={3600}
              value={data.voice.channelTimeout}
              onChange={(e) =>
                update({ voice: { ...data.voice, channelTimeout: parseInt(e.target.value) || 300 } })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
