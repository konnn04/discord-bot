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
import { Separator } from "@/components/ui/separator";
import {
  GuildChannelSelect,
  GuildRoleSelect,
} from "@/components/shared/guild-selects";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import {
  GIFTCODE_GAMES,
  HOYOVERSE_GAME_IDS,
  type GuildSettings,
} from "shared/src/types/settings.types";
import { Gift } from "lucide-react";

type Ctx = {
  data: GuildSettings;
  setData: (d: GuildSettings) => void;
  guildId: string;
};

const HOYOVERSE_GAMES = GIFTCODE_GAMES.filter((g) =>
  HOYOVERSE_GAME_IDS.includes(g.id),
);
const CRAWL_GAMES = GIFTCODE_GAMES.filter(
  (g) => !HOYOVERSE_GAME_IDS.includes(g.id),
);

export function GiftcodeSettings() {
  const { data, setData, guildId } = useOutletContext<Ctx>();
  const giftcode = data.giftcode ?? {
    enabled: false,
    channelId: null,
    mode: "common" as const,
    roleCommon: null,
    roles: {},
    games: [],
  };

  const save = (next: GuildSettings["giftcode"]) => {
    const patch = { giftcode: next };
    setData({ ...data, ...patch });
    api.put(API_ROUTES.GUILD_SETTINGS(guildId), patch).catch(() => {
      toast.error("Lưu thất bại");
    });
  };

  const toggleGame = (id: string, on: boolean) => {
    const set = new Set(giftcode.games);
    if (on) set.add(id);
    else set.delete(id);
    save({ ...giftcode, games: [...set] });
  };

  const gameRow = (game: { id: string; label: string }) => {
    const on = giftcode.games.includes(game.id);
    return (
      <div
        key={game.id}
        className="flex items-center justify-between gap-4 rounded-lg border p-3"
      >
        <span className="min-w-0 flex-1 truncate font-medium">
          {game.label}
        </span>
        {giftcode.mode === "perGame" && on && (
          <div className="w-56 shrink-0">
            <GuildRoleSelect
              guildId={guildId}
              value={giftcode.roles[game.id] ?? null}
              placeholder="Role riêng..."
              onChange={(roleId) =>
                save({
                  ...giftcode,
                  roles: { ...giftcode.roles, [game.id]: roleId },
                })
              }
            />
          </div>
        )}
        <Switch checked={on} onCheckedChange={(v) => toggleGame(game.id, v)} />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Giftcode
          </CardTitle>
          <CardDescription>
            Tự động thông báo giftcode mới cho các game bạn chọn. Game
            HoYoverse (Genshin, HSR, ZZZ...) dùng API chính thức; các game
            khác được cào tự động từ web mỗi 30 phút. Cách gửi và tag role thì
            giống nhau.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Bật thông báo giftcode</Label>
              <p className="text-sm text-muted-foreground">
                Gửi giftcode mới vào kênh đã chọn.
              </p>
            </div>
            <Switch
              checked={giftcode.enabled}
              onCheckedChange={(enabled) => save({ ...giftcode, enabled })}
            />
          </div>

          {giftcode.enabled && (
            <>
              <div className="space-y-2">
                <Label>Kênh thông báo</Label>
                <GuildChannelSelect
                  guildId={guildId}
                  value={giftcode.channelId}
                  onChange={(channelId) => save({ ...giftcode, channelId })}
                />
              </div>

              <div className="space-y-2">
                <Label>Chế độ tag role</Label>
                <Tabs
                  value={giftcode.mode}
                  onValueChange={(v) =>
                    save({ ...giftcode, mode: v as "common" | "perGame" })
                  }
                >
                  <TabsList>
                    <TabsTrigger value="common">Role chung</TabsTrigger>
                    <TabsTrigger value="perGame">
                      Role riêng từng game
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-sm text-muted-foreground">
                  {giftcode.mode === "common"
                    ? "Tag một role duy nhất cho mọi giftcode."
                    : "Tag role riêng theo từng game (chọn ở mỗi dòng bên dưới)."}
                </p>
              </div>

              {giftcode.mode === "common" && (
                <div className="space-y-2">
                  <Label>Role chung (tag cho mọi giftcode)</Label>
                  <GuildRoleSelect
                    guildId={guildId}
                    value={giftcode.roleCommon}
                    onChange={(roleCommon) => save({ ...giftcode, roleCommon })}
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Label>HoYoverse</Label>
                <div className="space-y-2">
                  {HOYOVERSE_GAMES.map(gameRow)}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Game khác (cào tự động)</Label>
                <div className="space-y-2">{CRAWL_GAMES.map(gameRow)}</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
