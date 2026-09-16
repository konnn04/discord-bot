import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuildChannelSelect } from "@/components/shared/guild-selects";
import { FloatingSaveBar } from "@/components/shared/floating-save-bar";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth.store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSettingsDraft } from "@/hooks/use-settings-draft";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type {
  GuildSettings,
  WelcomeEmbedConfig,
} from "shared/src/types/settings.types";
import { DoorOpen, LogOut, Send } from "lucide-react";
import { WelcomeEmbedEditor } from "./welcome/components/embed-editor";
import {
  PLACEHOLDER_TAGS,
  DEFAULT_WELCOME_EMBED,
  DEFAULT_WELCOME_DM_EMBED,
  simulatePlaceholders,
} from "./welcome/constants";

type Ctx = {
  data: GuildSettings;
  setData: (d: GuildSettings) => void;
  guildId: string;
};

interface WelcomeDraft {
  featuresWelcome: boolean;
  welcome: GuildSettings["welcome"];
}

export function WelcomeSettings() {
  const { data, setData, guildId } = useOutletContext<Ctx>();
  const [activeTab, setActiveTab] = useState<"canvas" | "embed" | "text">(
    data.welcome.type ?? "canvas",
  );
  const [dmTab, setDmTab] = useState<"text" | "embed">(
    data.welcome.dm?.type ?? "text",
  );

  const { draft, setDraft, isDirty, isSaving, save, discard } =
    useSettingsDraft<WelcomeDraft>({
      value: { featuresWelcome: data.features.welcome, welcome: data.welcome },
      onSave: async (next) => {
        const partial: Partial<GuildSettings> = {
          features: { ...data.features, welcome: next.featuresWelcome },
          welcome: next.welcome,
        };
        await api.put(API_ROUTES.GUILD_SETTINGS(guildId), partial);
        setData({ ...data, ...partial } as GuildSettings);
        toast.success("Đã lưu cài đặt Chào mừng!");
      },
    });

  const updateWelcome = (patch: Partial<GuildSettings["welcome"]>) => {
    setDraft((prev) => ({ ...prev, welcome: { ...prev.welcome, ...patch } }));
  };

  const embed: WelcomeEmbedConfig =
    draft.welcome.embed ?? DEFAULT_WELCOME_EMBED;
  const updateEmbed = (patch: Partial<WelcomeEmbedConfig>) =>
    updateWelcome({ embed: { ...embed, ...patch } });

  const dm = draft.welcome.dm ?? {
    enabled: false,
    type: "text" as const,
    message: null,
    embed: DEFAULT_WELCOME_DM_EMBED,
  };
  const dmEmbed: WelcomeEmbedConfig = dm.embed ?? DEFAULT_WELCOME_DM_EMBED;
  const updateDm = (patch: Partial<GuildSettings["welcome"]["dm"]>) =>
    updateWelcome({ dm: { ...dm, ...patch } });
  const updateDmEmbed = (patch: Partial<WelcomeEmbedConfig>) =>
    updateDm({ embed: { ...dmEmbed, ...patch } });

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

  // Canvas card preview — debounced so we don't re-render on every keystroke
  const authUser = useAuthStore((s) => s.user);
  const cardTitle = draft.welcome.card?.title || "Chào mừng {displayName}!";
  const cardSubtitle =
    draft.welcome.card?.subtitle || "Thành viên thứ #{memberCount}";
  const debouncedTitle = useDebouncedValue(cardTitle, 500);
  const debouncedSubtitle = useDebouncedValue(cardSubtitle, 500);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [cardPreviewLoading, setCardPreviewLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "canvas" || !draft.featuresWelcome) return;
    let cancelled = false;
    const avatarUrl = authUser
      ? `https://cdn.discordapp.com/avatars/${authUser.id}/${authUser.avatar}.png?size=128`
      : undefined;
    (async () => {
      setCardPreviewLoading(true);
      try {
        const res = await api.post<{ dataUrl: string }>(
          API_ROUTES.GUILD_WELCOME_CARD_PREVIEW(guildId),
          {
            title: simulatePlaceholders(debouncedTitle),
            subtitle: simulatePlaceholders(debouncedSubtitle),
            avatarUrl,
          },
        );
        if (!cancelled) setCardPreviewUrl(res.dataUrl);
      } catch {
        if (!cancelled) toast.error("Không thể tạo ảnh xem trước Card");
      } finally {
        if (!cancelled) setCardPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedTitle,
    debouncedSubtitle,
    activeTab,
    draft.featuresWelcome,
    guildId,
  ]);

  return (
    <div className="space-y-6 pb-32">
      {/* Welcome Card Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-primary" />
            Tin nhắn Chào mừng
          </CardTitle>
          <CardDescription>
            Tự động gửi lời chào khi thành viên mới tham gia vào server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label
                className="text-base font-semibold"
                htmlFor="welcome-enabled"
              >
                Bật tính năng chào mừng
              </Label>
              <p className="text-sm text-muted-foreground">
                Gửi thông báo chào đón khi có người mới vào server
              </p>
            </div>
            <Switch
              id="welcome-enabled"
              checked={draft.featuresWelcome}
              onCheckedChange={(v) =>
                setDraft((prev) => ({ ...prev, featuresWelcome: v }))
              }
            />
          </div>

          {draft.featuresWelcome && (
            <>
              <div className="space-y-2">
                <Label>Kênh gửi tin nhắn chào mừng</Label>
                <GuildChannelSelect
                  guildId={guildId}
                  value={draft.welcome.channelId}
                  onChange={(channelId) => updateWelcome({ channelId })}
                />
              </div>

              <div className="space-y-3">
                <Label>Định dạng tin nhắn</Label>
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => {
                    const nextType = v as "text" | "embed" | "canvas";
                    setActiveTab(nextType);
                    updateWelcome({ type: nextType });
                  }}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="canvas">
                      🎨 Ảnh Card (Canvas)
                    </TabsTrigger>
                    <TabsTrigger value="embed">✨ Rich Embed</TabsTrigger>
                    <TabsTrigger value="text">💬 Text đơn giản</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Canvas Mode */}
              {activeTab === "canvas" && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                  <div className="space-y-4 rounded-xl border bg-card p-4 xl:col-span-6">
                    <div className="space-y-2">
                      <Label htmlFor="card-title">Tiêu đề trên ảnh Card</Label>
                      <Input
                        id="card-title"
                        placeholder="Chào mừng {displayName}!"
                        value={draft.welcome.card?.title ?? ""}
                        onChange={(e) =>
                          updateWelcome({
                            card: {
                              ...(draft.welcome.card ?? {
                                title: null,
                                subtitle: null,
                              }),
                              title: e.target.value || null,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-subtitle">
                        Phụ đề trên ảnh Card
                      </Label>
                      <Input
                        id="card-subtitle"
                        placeholder="Thành viên thứ #{memberCount} của {server}"
                        value={draft.welcome.card?.subtitle ?? ""}
                        onChange={(e) =>
                          updateWelcome({
                            card: {
                              ...(draft.welcome.card ?? {
                                title: null,
                                subtitle: null,
                              }),
                              subtitle: e.target.value || null,
                            },
                          })
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hỗ trợ placeholder: {"{displayName}"}, {"{user}"},{" "}
                      {"{server}"}, {"{memberCount}"}
                    </p>
                  </div>

                  {/* Live Card Preview */}
                  <div className="xl:col-span-6">
                    <div className="sticky top-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Xem trước ảnh Card
                        </Label>
                        <Badge
                          variant="outline"
                          className="text-[11px] text-primary border-primary/30"
                        >
                          {cardPreviewLoading ? "Đang tạo…" : "Thời gian thực"}
                        </Badge>
                      </div>
                      <div className="flex aspect-1000/320 w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
                        {cardPreviewUrl ? (
                          <img
                            src={cardPreviewUrl}
                            alt="Xem trước Welcome Card"
                            className={`h-full w-full object-contain transition-opacity ${cardPreviewLoading ? "opacity-50" : "opacity-100"}`}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {cardPreviewLoading
                              ? "Đang tạo ảnh xem trước…"
                              : "Chưa có ảnh xem trước"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Text Mode */}
              {activeTab === "text" && (
                <div className="space-y-4 rounded-xl border bg-card p-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcome-message">Nội dung văn bản</Label>
                    <Textarea
                      id="welcome-message"
                      rows={4}
                      value={draft.welcome.message ?? ""}
                      onChange={(e) =>
                        updateWelcome({ message: e.target.value || null })
                      }
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {PLACEHOLDER_TAGS.map((t) => (
                        <Badge
                          key={t.tag}
                          variant="secondary"
                          className="cursor-pointer transition-colors hover:bg-primary/20"
                          onClick={() => {
                            const cur = draft.welcome.message ?? "";
                            updateWelcome({
                              message: cur ? `${cur} ${t.tag}` : t.tag,
                            });
                          }}
                        >
                          {t.tag}{" "}
                          <span className="ml-1 opacity-60">({t.desc})</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* EMBED MODE: Split Editor & Live Preview */}
              {activeTab === "embed" && (
                <WelcomeEmbedEditor embed={embed} onChange={updateEmbed} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Welcome DM Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Tin nhắn riêng (DM)
          </CardTitle>
          <CardDescription>
            Gửi tin nhắn riêng cho thành viên mới khi họ tham gia server (mặc
            định tắt)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label
                className="text-base font-semibold"
                htmlFor="welcome-dm-enabled"
              >
                Bật gửi DM chào mừng
              </Label>
              <p className="text-sm text-muted-foreground">
                Thành viên có thể tắt DM từ server nên đây là tính năng
                "best-effort"
              </p>
            </div>
            <Switch
              id="welcome-dm-enabled"
              checked={dm.enabled}
              onCheckedChange={(enabled) => updateDm({ enabled })}
            />
          </div>

          {dm.enabled && (
            <>
              <div className="space-y-3">
                <Label>Định dạng tin nhắn</Label>
                <Tabs
                  value={dmTab}
                  onValueChange={(v) => {
                    const nextType = v as "text" | "embed";
                    setDmTab(nextType);
                    updateDm({ type: nextType });
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">💬 Text đơn giản</TabsTrigger>
                    <TabsTrigger value="embed">✨ Rich Embed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {dmTab === "text" && (
                <div className="space-y-4 rounded-xl border bg-card p-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcome-dm-message">Nội dung văn bản</Label>
                    <Textarea
                      id="welcome-dm-message"
                      rows={4}
                      value={dm.message ?? ""}
                      onChange={(e) =>
                        updateDm({ message: e.target.value || null })
                      }
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {PLACEHOLDER_TAGS.map((t) => (
                        <Badge
                          key={t.tag}
                          variant="secondary"
                          className="cursor-pointer transition-colors hover:bg-primary/20"
                          onClick={() => {
                            const cur = dm.message ?? "";
                            updateDm({
                              message: cur ? `${cur} ${t.tag}` : t.tag,
                            });
                          }}
                        >
                          {t.tag}{" "}
                          <span className="ml-1 opacity-60">({t.desc})</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {dmTab === "embed" && (
                <WelcomeEmbedEditor embed={dmEmbed} onChange={updateDmEmbed} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Leave Message Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-destructive" />
            Tin nhắn Tạm biệt
          </CardTitle>
          <CardDescription>
            Tin nhắn thông báo khi một thành viên rời khỏi server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Kênh thông báo tạm biệt</Label>
            <GuildChannelSelect
              guildId={guildId}
              value={draft.welcome.leaveChannelId}
              onChange={(leaveChannelId) => updateWelcome({ leaveChannelId })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave-message">Nội dung tin nhắn tạm biệt</Label>
            <Textarea
              id="leave-message"
              rows={3}
              placeholder="Tạm biệt {displayName}, chúc bạn nhiều may mắn!"
              value={draft.welcome.leaveMessage ?? ""}
              onChange={(e) =>
                updateWelcome({ leaveMessage: e.target.value || null })
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
