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
import {
  GuildChannelSelect,
  GuildRoleSelect,
} from "@/components/shared/guild-selects";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import {
  GIFTCODE_CRAWL_GAMES,
  type GuildSettings,
} from "shared/src/types/settings.types";
import { Radar } from "lucide-react";

type Ctx = {
  data: GuildSettings;
  setData: (d: GuildSettings) => void;
  guildId: string;
};

export function GiftcodeCrawlSettings() {
  const { data, setData, guildId } = useOutletContext<Ctx>();
  const crawl = data.giftcodeCrawl ?? {
    enabled: false,
    channelId: null,
    roleId: null,
    games: [],
  };

  const save = (next: GuildSettings["giftcodeCrawl"]) => {
    const patch = { giftcodeCrawl: next };
    setData({ ...data, ...patch });
    api.put(API_ROUTES.GUILD_SETTINGS(guildId), patch).catch(() => {
      toast.error("Lưu thất bại");
    });
  };

  const toggleGame = (id: string, on: boolean) => {
    const set = new Set(crawl.games);
    if (on) set.add(id);
    else set.delete(id);
    save({ ...crawl, games: [...set] });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-primary" />
            Giftcode — Game khác
          </CardTitle>
          <CardDescription>
            Tự động cào giftcode cho các game chưa có API chính thức (NTE,
            Wuthering Waves, Arknights, Where Winds Meet...). Kiểm tra mỗi 30
            phút.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Bật cào giftcode</Label>
              <p className="text-sm text-muted-foreground">
                Gửi giftcode mới vào kênh đã chọn.
              </p>
            </div>
            <Switch
              checked={crawl.enabled}
              onCheckedChange={(enabled) => save({ ...crawl, enabled })}
            />
          </div>

          {crawl.enabled && (
            <>
              <div className="space-y-2">
                <Label>Kênh thông báo</Label>
                <GuildChannelSelect
                  guildId={guildId}
                  value={crawl.channelId}
                  onChange={(channelId) => save({ ...crawl, channelId })}
                />
              </div>

              <div className="space-y-2">
                <Label>Role tag (tuỳ chọn)</Label>
                <GuildRoleSelect
                  guildId={guildId}
                  value={crawl.roleId}
                  onChange={(roleId) => save({ ...crawl, roleId })}
                />
                <p className="text-xs text-muted-foreground">
                  Nếu không chọn, bot vẫn gửi giftcode nhưng không tag ai.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Game cần theo dõi</Label>
                {GIFTCODE_CRAWL_GAMES.map((game) => {
                  const on = crawl.games.includes(game.id);
                  return (
                    <div
                      key={game.id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <span className="font-medium">{game.label}</span>
                      <Switch
                        checked={on}
                        onCheckedChange={(v) => toggleGame(game.id, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
