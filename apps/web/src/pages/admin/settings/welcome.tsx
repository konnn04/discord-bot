import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { GuildSettings } from "shared/src/types/settings.types";
import { DoorOpen, LogOut } from "lucide-react";

type Ctx = { data: GuildSettings; setData: (d: GuildSettings) => void; guildId: string };

export function WelcomeSettings() {
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-primary" />
            Chào mừng
          </CardTitle>
          <CardDescription>
            Tin nhắn gửi khi thành viên mới tham gia server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="welcome-enabled">Bật chào mừng</Label>
            <Switch
              id="welcome-enabled"
              checked={data.features.welcome}
              onCheckedChange={(v) =>
                update({ features: { ...data.features, welcome: v } })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome-channel">Kênh chào mừng</Label>
            <Input
              id="welcome-channel"
              placeholder="Channel ID..."
              value={data.welcome.channelId ?? ""}
              onChange={(e) =>
                update({ welcome: { ...data.welcome, channelId: e.target.value || null } })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome-message">Nội dung</Label>
            <Textarea
              id="welcome-message"
              rows={4}
              value={data.welcome.message ?? ""}
              onChange={(e) =>
                update({ welcome: { ...data.welcome, message: e.target.value || null } })
              }
            />
            <p className="text-xs text-muted-foreground">
              Hỗ trợ: {"{user}"}, {"{server}"}, {"{memberCount}"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-destructive" />
            Tạm biệt
          </CardTitle>
          <CardDescription>
            Tin nhắn gửi khi thành viên rời server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leave-channel">Kênh tạm biệt</Label>
            <Input
              id="leave-channel"
              placeholder="Channel ID..."
              value={data.welcome.leaveChannelId ?? ""}
              onChange={(e) =>
                update({ welcome: { ...data.welcome, leaveChannelId: e.target.value || null } })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave-message">Nội dung</Label>
            <Textarea
              id="leave-message"
              rows={3}
              value={data.welcome.leaveMessage ?? ""}
              onChange={(e) =>
                update({ welcome: { ...data.welcome, leaveMessage: e.target.value || null } })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
