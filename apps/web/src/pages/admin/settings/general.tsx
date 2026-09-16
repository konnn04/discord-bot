import { useOutletContext } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { GuildChannelSelect } from "@/components/shared/guild-selects";
import { GuildMultiSelect } from "@/components/shared/guild-multi-select";
import { FloatingSaveBar } from "@/components/shared/floating-save-bar";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import { useSettingsDraft } from "@/hooks/use-settings-draft";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type { GuildSettings } from "shared/src/types/settings.types";
import {
  Hash,
  HashIcon,
  Activity,
  Music,
  ShieldCheck,
  Users,
} from "lucide-react";

type Ctx = {
  data: GuildSettings;
  setData: (d: GuildSettings) => void;
  guildId: string;
};

interface GeneralDraft {
  features: GuildSettings["features"];
  rankApi: GuildSettings["rankApi"];
  prefix: string;
  language: string;
  xp: GuildSettings["xp"];
  music: GuildSettings["music"];
  moderation: GuildSettings["moderation"];
  voice: GuildSettings["voice"];
}

export function GeneralSettings() {
  const { data, setData, guildId } = useOutletContext<Ctx>();

  const { draft, setDraft, isDirty, isSaving, save, discard } =
    useSettingsDraft<GeneralDraft>({
      value: {
        features: data.features,
        rankApi: data.rankApi,
        prefix: data.prefix,
        language: data.language,
        xp: data.xp,
        music: data.music,
        moderation: data.moderation,
        voice: data.voice,
      },
      onSave: async (next) => {
        await api.put(API_ROUTES.GUILD_SETTINGS(guildId), next);
        setData({ ...data, ...next });
        toast.success("Đã lưu cài đặt chung!");
      },
    });

  const update = (partial: Partial<GeneralDraft>) =>
    setDraft((prev) => ({ ...prev, ...partial }));

  const handleSave = async () => {
    try {
      await save();
    } catch {
      toast.error("Lưu cài đặt thất bại!");
    }
  };
  const handleDiscard = () => {
    discard();
    toast.info("Đã khôi phục cài đặt trước đó");
  };
  const blocker = useUnsavedChangesGuard(isDirty);

  return (
    <div className="space-y-6 pb-32">
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
              checked={draft.features.xpTracking}
              onCheckedChange={(v) =>
                update({ features: { ...draft.features, xpTracking: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="feat-meeting">Theo dõi Meeting</Label>
            <Switch
              id="feat-meeting"
              checked={draft.features.meetingTracking}
              onCheckedChange={(v) =>
                update({ features: { ...draft.features, meetingTracking: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="feat-mod">Moderation</Label>
            <Switch
              id="feat-mod"
              checked={draft.features.moderation}
              onCheckedChange={(v) =>
                update({ features: { ...draft.features, moderation: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="feat-tag-voice">Tag trong voice</Label>
            <Switch
              id="feat-tag-voice"
              checked={draft.features.tagMembersInVoice}
              onCheckedChange={(v) =>
                update({
                  features: { ...draft.features, tagMembersInVoice: v },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="feat-rank">Rank API (public)</Label>
            <Switch
              id="feat-rank"
              checked={draft.rankApi.enabled}
              onCheckedChange={(v) => update({ rankApi: { enabled: v } })}
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
              value={draft.prefix}
              onChange={(e) => update({ prefix: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lang">Ngôn ngữ</Label>
            <Select
              value={draft.language}
              onValueChange={(v) => update({ language: v })}
            >
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
              value={draft.xp.xpPerMessage}
              onChange={(e) =>
                update({
                  xp: {
                    ...draft.xp,
                    xpPerMessage: parseInt(e.target.value) || 15,
                  },
                })
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
              value={draft.xp.xpPerVoiceMinute}
              onChange={(e) =>
                update({
                  xp: {
                    ...draft.xp,
                    xpPerVoiceMinute: parseInt(e.target.value) || 10,
                  },
                })
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
              value={draft.xp.messageCooldown}
              onChange={(e) =>
                update({
                  xp: {
                    ...draft.xp,
                    messageCooldown: parseInt(e.target.value) || 60,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Kênh bỏ qua XP</Label>
            <GuildMultiSelect
              guildId={guildId}
              kind="channel"
              values={draft.xp.ignoredChannels}
              onChange={(ignoredChannels) =>
                update({ xp: { ...draft.xp, ignoredChannels } })
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Role bỏ qua XP</Label>
            <GuildMultiSelect
              guildId={guildId}
              kind="role"
              values={draft.xp.ignoredRoles}
              onChange={(ignoredRoles) =>
                update({ xp: { ...draft.xp, ignoredRoles } })
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
              value={draft.music.defaultVolume}
              onChange={(e) =>
                update({
                  music: {
                    ...draft.music,
                    defaultVolume: parseInt(e.target.value) || 80,
                  },
                })
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
              value={draft.music.autoLeaveTimeout}
              onChange={(e) =>
                update({
                  music: {
                    ...draft.music,
                    autoLeaveTimeout: parseInt(e.target.value) || 120,
                  },
                })
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
              value={draft.moderation.logChannelId}
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
              value={draft.voice.channelTimeout}
              onChange={(e) =>
                update({
                  voice: {
                    ...draft.voice,
                    channelTimeout: parseInt(e.target.value) || 300,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <FloatingSaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />
      <UnsavedChangesDialog
        blocker={blocker}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
