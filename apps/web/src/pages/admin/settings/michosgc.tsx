import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { GuildSettings } from "shared/src/types/settings.types";
import { Gamepad2, Sword, Sparkles, Zap, Gem, Telescope } from "lucide-react";

type Ctx = { data: GuildSettings; setData: (d: GuildSettings) => void; guildId: string };

const GAME_ROLES = [
  { key: "genshin" as const, label: "Genshin Impact", icon: Sparkles },
  { key: "hkrpg" as const, label: "Honkai: Star Rail", icon: Gem },
  { key: "honkai3rd" as const, label: "Honkai Impact 3rd", icon: Sword },
  { key: "nap" as const, label: "Zenless Zone Zero", icon: Zap },
  { key: "tot" as const, label: "Tears of Themis", icon: Telescope },
] as const;

export function MichosgcSettings() {
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
            <Gamepad2 className="h-4 w-4 text-primary" />
            Game Roles
          </CardTitle>
          <CardDescription>
            Role được tag khi có giftcode của từng game
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-common">Role chung (tag tất cả game)</Label>
            <Input
              id="role-common"
              placeholder="Role ID..."
              value={data.michosgc.roleCommon ?? ""}
              onChange={(e) =>
                update({ michosgc: { ...data.michosgc, roleCommon: e.target.value || null } })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {GAME_ROLES.map((game) => {
              const Icon = game.icon;
              return (
                <div key={game.key} className="space-y-2">
                  <Label htmlFor={`role-${game.key}`} className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {game.label}
                  </Label>
                  <Input
                    id={`role-${game.key}`}
                    placeholder="Role ID..."
                    value={data.michosgc.roles[game.key] ?? ""}
                    onChange={(e) =>
                      update({
                        michosgc: {
                          ...data.michosgc,
                          roles: { ...data.michosgc.roles, [game.key]: e.target.value || null },
                        },
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
