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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import {
  CHATBOT_TOOLS,
  type GuildSettings,
} from "shared/src/types/settings.types";
import { Bot, ShieldAlert } from "lucide-react";

type Ctx = {
  data: GuildSettings;
  setData: (d: GuildSettings) => void;
  guildId: string;
};

export function ChatbotSettings() {
  const { data, setData, guildId } = useOutletContext<Ctx>();
  const chatbot = data.chatbot ?? {
    enabled: false,
    provider: "gemini" as const,
    allowedTools: [],
  };

  const save = (next: GuildSettings["chatbot"]) => {
    const patch = { chatbot: next };
    setData({ ...data, ...patch });
    api.put(API_ROUTES.GUILD_SETTINGS(guildId), patch).catch(() => {
      toast.error("Lưu thất bại");
    });
  };

  const toggleTool = (id: string, on: boolean) => {
    const set = new Set(chatbot.allowedTools);
    if (on) set.add(id);
    else set.delete(id);
    save({ ...chatbot, allowedTools: [...set] });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Chatbot AI
          </CardTitle>
          <CardDescription>
            Bot trả lời khi được tag tên. Bạn kiểm soát chính xác những lệnh nào
            bot được phép dùng để tránh lạm dụng.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Bật Chatbot</Label>
              <p className="text-sm text-muted-foreground">
                Phản hồi khi thành viên tag bot trong kênh chat.
              </p>
            </div>
            <Switch
              checked={chatbot.enabled}
              onCheckedChange={(enabled) => save({ ...chatbot, enabled })}
            />
          </div>

          {chatbot.enabled && (
            <div className="space-y-2">
              <Label>Mô hình AI</Label>
              <Tabs
                value={chatbot.provider}
                onValueChange={(v) =>
                  save({ ...chatbot, provider: v as "gemini" | "deepseek" })
                }
              >
                <TabsList>
                  <TabsTrigger value="gemini">Gemini Flash Lite</TabsTrigger>
                  <TabsTrigger value="deepseek">DeepSeek</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground">
                Cần cấu hình API key tương ứng trong biến môi trường của server
                ({chatbot.provider === "gemini" ? "GEMINI_API_KEY" : "DEEPSEEK_API_KEY"}).
              </p>
            </div>
          )}

          {chatbot.enabled && (
            <div className="space-y-3">
              <Label>Công cụ được phép dùng</Label>
              {CHATBOT_TOOLS.map((tool) => {
                const on = chatbot.allowedTools.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tool.label}</span>
                        {tool.risky && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
                          >
                            <ShieldAlert className="h-3 w-3" />
                            Nhạy cảm
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tool.description}
                      </p>
                    </div>
                    <Switch
                      checked={on}
                      onCheckedChange={(v) => toggleTool(tool.id, v)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
