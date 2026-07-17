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
import { Button } from "@/components/ui/button";
import { GuildRoleSelect } from "@/components/shared/guild-selects";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { GuildSettings } from "shared/src/types/settings.types";
import { Trophy, Plus, Trash2 } from "lucide-react";

type Ctx = {
  data: GuildSettings;
  setData: (d: GuildSettings) => void;
  guildId: string;
};

export function RoleRankSettings() {
  const { data, setData, guildId } = useOutletContext<Ctx>();
  const roleRank = data.roleRank ?? { enabled: false, rules: [] };

  const save = (next: GuildSettings["roleRank"]) => {
    const patch = { roleRank: next };
    setData({ ...data, ...patch });
    api.put(API_ROUTES.GUILD_SETTINGS(guildId), patch).catch(() => {
      toast.error("Lưu thất bại");
    });
  };

  const rules = [...roleRank.rules].sort((a, b) => a.level - b.level);

  const updateRule = (index: number, level: number, roleId: string | null) => {
    const nextRules = rules.map((r, i) =>
      i === index ? { level, roleId: roleId ?? "" } : r,
    );
    save({ ...roleRank, rules: nextRules });
  };

  const addRule = () => {
    const maxLevel = rules.reduce((m, r) => Math.max(m, r.level), 0);
    save({
      ...roleRank,
      rules: [...rules, { level: maxLevel + 5, roleId: "" }],
    });
  };

  const removeRule = (index: number) => {
    save({ ...roleRank, rules: rules.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Role theo Level
          </CardTitle>
          <CardDescription>
            Tự động cấp role khi thành viên đạt mốc level. Chỉ giữ 1 role tương
            ứng level cao nhất đạt được (không cộng dồn).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Bật cấp role theo level</Label>
              <p className="text-sm text-muted-foreground">
                Áp dụng mỗi khi thành viên lên level.
              </p>
            </div>
            <Switch
              checked={roleRank.enabled}
              onCheckedChange={(enabled) => save({ ...roleRank, enabled })}
            />
          </div>

          {roleRank.enabled && (
            <div className="space-y-3">
              {rules.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Chưa có luật nào. Thêm mốc level đầu tiên bên dưới.
                </p>
              )}
              {rules.map((rule, index) => (
                <div
                  key={index}
                  className="flex items-end gap-3 rounded-lg border p-3"
                >
                  <div className="w-24 space-y-1.5">
                    <Label className="text-xs">Level</Label>
                    <Input
                      type="number"
                      min={1}
                      value={rule.level}
                      onChange={(e) =>
                        updateRule(
                          index,
                          parseInt(e.target.value) || 1,
                          rule.roleId || null,
                        )
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Role được cấp</Label>
                    <GuildRoleSelect
                      guildId={guildId}
                      value={rule.roleId || null}
                      clearable={false}
                      onChange={(roleId) =>
                        updateRule(index, rule.level, roleId)
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeRule(index)}
                    aria-label="Xóa luật"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addRule} className="gap-2">
                <Plus className="h-4 w-4" />
                Thêm mốc level
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
