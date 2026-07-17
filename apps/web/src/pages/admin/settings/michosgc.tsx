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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GuildChannelSelect,
  GuildRoleSelect,
} from "@/components/shared/guild-selects";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { GuildSettings } from "shared/src/types/settings.types";
import { Gift, Sword, Sparkles, Zap, Gem, Telescope } from "lucide-react";

type Ctx = {
  data: GuildSettings;
  setData: (d: GuildSettings) => void;
  guildId: string;
};

const GAME_ROLES = [
  { key: "genshin" as const, label: "Genshin Impact", icon: Sparkles },
  { key: "hkrpg" as const, label: "Honkai: Star Rail", icon: Gem },
  { key: "honkai3rd" as const, label: "Honkai Impact 3rd", icon: Sword },
  { key: "nap" as const, label: "Zenless Zone Zero", icon: Zap },
  { key: "tot" as const, label: "Tears of Themis", icon: Telescope },
] as const;

export function MichosgcSettings() {
  const { data, setData, guildId } = useOutletContext<Ctx>();
  const m = data.michosgc;

  const updateMichosgc = (partial: Partial<GuildSettings["michosgc"]>) => {
    const nextMichosgc = { ...m, ...partial };
    const patch = { michosgc: nextMichosgc };
    setData({ ...data, ...patch });
    api.put(API_ROUTES.GUILD_SETTINGS(guildId), patch).catch(() => {
      toast.error("Lưu thất bại");
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Thông báo Giftcode
          </CardTitle>
          <CardDescription>
            Tự động thông báo khi có giftcode mới cho các game HoYoverse và tag
            role tương ứng.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Bật thông báo giftcode</Label>
              <p className="text-sm text-muted-foreground">
                Gửi giftcode mới vào kênh đã chọn.
              </p>
            </div>
            <Switch
              checked={m.enabled}
              onCheckedChange={(enabled) => updateMichosgc({ enabled })}
            />
          </div>

          {m.enabled && (
            <>
              {/* Notify channel */}
              <div className="space-y-2">
                <Label>Kênh thông báo</Label>
                <GuildChannelSelect
                  guildId={guildId}
                  value={m.channelId}
                  onChange={(channelId) => updateMichosgc({ channelId })}
                />
              </div>

              {/* Mode selector */}
              <div className="space-y-2">
                <Label>Chế độ tag role</Label>
                <Tabs
                  value={m.mode}
                  onValueChange={(v) =>
                    updateMichosgc({ mode: v as "common" | "perGame" })
                  }
                >
                  <TabsList>
                    <TabsTrigger value="common">Role chung</TabsTrigger>
                    <TabsTrigger value="perGame">Role riêng từng game</TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-sm text-muted-foreground">
                  {m.mode === "common"
                    ? "Tag một role duy nhất cho mọi giftcode."
                    : "Tag role riêng theo từng game."}
                </p>
              </div>

              {/* Role config */}
              {m.mode === "common" ? (
                <div className="space-y-2">
                  <Label>Role chung (tag cho mọi giftcode)</Label>
                  <GuildRoleSelect
                    guildId={guildId}
                    value={m.roleCommon}
                    onChange={(roleCommon) => updateMichosgc({ roleCommon })}
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {GAME_ROLES.map((game) => {
                    const Icon = game.icon;
                    return (
                      <div key={game.key} className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {game.label}
                        </Label>
                        <GuildRoleSelect
                          guildId={guildId}
                          value={m.roles[game.key]}
                          onChange={(role) =>
                            updateMichosgc({
                              roles: { ...m.roles, [game.key]: role },
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
