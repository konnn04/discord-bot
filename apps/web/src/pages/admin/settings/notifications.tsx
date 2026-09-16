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
import { Separator } from "@/components/ui/separator";
import { GuildChannelSelect } from "@/components/shared/guild-selects";
import { FloatingSaveBar } from "@/components/shared/floating-save-bar";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import { useSettingsDraft } from "@/hooks/use-settings-draft";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type { GuildSettings } from "shared/src/types/settings.types";
import { Brain, Trophy, MicVocal, ArrowUp } from "lucide-react";

type Ctx = {
  data: GuildSettings;
  setData: (d: GuildSettings) => void;
  guildId: string;
};

interface NotificationsDraft {
  features: GuildSettings["features"];
  dailyLeetCode: GuildSettings["dailyLeetCode"];
  leetcodeContest: GuildSettings["leetcodeContest"];
  xp: GuildSettings["xp"];
}

export function NotificationsSettings() {
  const { data, setData, guildId } = useOutletContext<Ctx>();

  const { draft, setDraft, isDirty, isSaving, save, discard } =
    useSettingsDraft<NotificationsDraft>({
      value: {
        features: data.features,
        dailyLeetCode: data.dailyLeetCode,
        leetcodeContest: data.leetcodeContest,
        xp: data.xp,
      },
      onSave: async (next) => {
        await api.put(API_ROUTES.GUILD_SETTINGS(guildId), next);
        setData({ ...data, ...next });
        toast.success("Đã lưu cài đặt Thông báo!");
      },
    });

  const update = (partial: Partial<NotificationsDraft>) =>
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
      {/* LeetCode Daily */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-chart-2" />
            LeetCode Daily
          </CardTitle>
          <CardDescription>Gửi bài tập LeetCode mỗi ngày</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="leetcode-enabled">Bật LeetCode Daily</Label>
            <Switch
              id="leetcode-enabled"
              checked={draft.features.dailyLeetCode}
              onCheckedChange={(v) =>
                update({ features: { ...draft.features, dailyLeetCode: v } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Kênh gửi</Label>
            <GuildChannelSelect
              guildId={guildId}
              value={draft.dailyLeetCode.channelId}
              onChange={(channelId) => update({ dailyLeetCode: { channelId } })}
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
              checked={draft.features.leetcodeContest}
              onCheckedChange={(v) =>
                update({ features: { ...draft.features, leetcodeContest: v } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Kênh gửi</Label>
            <GuildChannelSelect
              guildId={guildId}
              value={draft.leetcodeContest.channelId}
              onChange={(channelId) =>
                update({ leetcodeContest: { channelId } })
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
          <CardDescription>Thông báo khi thành viên lên level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="lvlup-enabled">Bật thông báo level up</Label>
            <Switch
              id="lvlup-enabled"
              checked={draft.xp.levelUpNotification}
              onCheckedChange={(v) =>
                update({ xp: { ...draft.xp, levelUpNotification: v } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Kênh gửi</Label>
            <GuildChannelSelect
              guildId={guildId}
              value={draft.xp.levelUpChannelId}
              onChange={(levelUpChannelId) =>
                update({ xp: { ...draft.xp, levelUpChannelId } })
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
              checked={draft.features.voiceWelcome}
              onCheckedChange={(v) =>
                update({ features: { ...draft.features, voiceWelcome: v } })
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
