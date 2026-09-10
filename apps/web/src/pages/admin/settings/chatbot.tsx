import { useState, useEffect, useMemo } from "react";
import { useOutletContext, Link } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { GuildSettings } from "shared/src/types/settings.types";
import { Bot, Brain, ArrowRight, Loader2 } from "lucide-react";

import type {
  ChatbotConfigData,
  ChatbotFormState,
  TestResult,
} from "./chatbot/types";
import { ProviderSelector } from "./chatbot/components/provider-selector";
import { CredentialsSection } from "./chatbot/components/credentials-section";
import { ModelSelector } from "./chatbot/components/model-selector";
import { ConnectionTester } from "./chatbot/components/connection-tester";
import { VisionSection } from "./chatbot/components/vision-section";
import { ToolsSelector } from "./chatbot/components/tools-selector";
import { FloatingSaveBar } from "./chatbot/components/floating-save-bar";

type Ctx = {
  data: GuildSettings;
  setData: (d: GuildSettings) => void;
  guildId: string;
};

export function ChatbotSettings() {
  const { data, setData, guildId } = useOutletContext<Ctx>();

  const savedChatbot = data.chatbot;
  const initialFormState: ChatbotFormState = useMemo(
    () => ({
      enabled: savedChatbot?.enabled ?? false,
      provider:
        (savedChatbot?.provider as "agentrouter" | "gemini" | "deepseek") ||
        "agentrouter",
      model: savedChatbot?.model ?? "",
      apiKey: savedChatbot?.apiKey ?? "",
      baseUrl: savedChatbot?.baseUrl ?? "",
      allowedTools: savedChatbot?.allowedTools ?? [],
      readImages: savedChatbot?.readImages ?? true,
      compressImages: savedChatbot?.compressImages ?? true,
    }),
    [savedChatbot],
  );

  const [formState, setFormState] = useState<ChatbotFormState>(initialFormState);
  const [config, setConfig] = useState<ChatbotConfigData | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [fetchedModelsMap, setFetchedModelsMap] = useState<
    Record<string, string[]>
  >({});

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    setFormState(initialFormState);
  }, [initialFormState]);

  useEffect(() => {
    let mounted = true;
    setLoadingConfig(true);
    api
      .get<{ success: boolean; data: ChatbotConfigData }>(
        API_ROUTES.GUILD_CHATBOT_CONFIG(guildId),
      )
      .then((res) => {
        if (mounted && res?.data) setConfig(res.data);
      })
      .catch((err) => {
        console.error("Failed to load chatbot config:", err);
      })
      .finally(() => {
        if (mounted) setLoadingConfig(false);
      });
    return () => {
      mounted = false;
    };
  }, [guildId]);

  const currentProviderInfo = config?.providers.find(
    (p) => p.id === formState.provider,
  );

  const availableModels = useMemo(() => {
    const list = [
      ...(fetchedModelsMap[formState.provider] || []),
      ...(currentProviderInfo?.models || []),
    ];
    return Array.from(new Set(list.filter(Boolean)));
  }, [formState.provider, fetchedModelsMap, currentProviderInfo]);

  const isDirty = useMemo(() => {
    if (formState.enabled !== initialFormState.enabled) return true;
    if (formState.provider !== initialFormState.provider) return true;
    if (formState.model.trim() !== initialFormState.model.trim()) return true;
    if (formState.apiKey.trim() !== initialFormState.apiKey.trim()) return true;
    if (formState.baseUrl.trim() !== initialFormState.baseUrl.trim()) return true;
    if (formState.readImages !== initialFormState.readImages) return true;
    if (formState.compressImages !== initialFormState.compressImages) return true;

    const toolsA = [...formState.allowedTools].sort();
    const toolsB = [...initialFormState.allowedTools].sort();
    if (toolsA.length !== toolsB.length) return true;
    for (let i = 0; i < toolsA.length; i++) {
      if (toolsA[i] !== toolsB[i]) return true;
    }
    return false;
  }, [formState, initialFormState]);

  const handleProviderSelect = (
    provider: "agentrouter" | "gemini" | "deepseek",
  ) => {
    if (provider === formState.provider) return;
    const pInfo = config?.providers.find((p) => p.id === provider);
    const defaultModel =
      pInfo?.models[0] ||
      (provider === "gemini"
        ? "gemini-2.5-flash"
        : provider === "deepseek"
          ? "deepseek-chat"
          : "deepseek-v4-flash");

    setFormState((prev) => ({ ...prev, provider, model: defaultModel }));
    setTestResult(null);
  };

  const handleFetchModels = async () => {
    setIsRefreshingModels(true);
    try {
      const res = await api.post<{
        success: boolean;
        data: { provider: string; models: string[] };
      }>(API_ROUTES.GUILD_CHATBOT_MODELS(guildId), {
        provider: formState.provider,
        apiKey: formState.apiKey.trim() || undefined,
        baseUrl: formState.baseUrl.trim() || undefined,
      });

      if (res?.data?.models?.length) {
        const fetched = res.data.models;
        setFetchedModelsMap((prev) => ({
          ...prev,
          [formState.provider]: fetched,
        }));
        if (!formState.model || !fetched.includes(formState.model)) {
          setFormState((prev) => ({ ...prev, model: fetched[0] }));
        }
        toast.success(`Đã tải ${fetched.length} model từ API!`);
      } else {
        toast.info("API không trả về model khả dụng");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể lấy model từ API");
    } finally {
      setIsRefreshingModels(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.post<TestResult>(
        API_ROUTES.GUILD_CHATBOT_TEST(guildId),
        {
          provider: formState.provider,
          model: formState.model.trim() || undefined,
          apiKey: formState.apiKey.trim() || undefined,
          baseUrl: formState.baseUrl.trim() || undefined,
        },
      );

      setTestResult(res);
      if (res.success) {
        toast.success(`Kết nối thành công! (${res.latencyMs}ms)`);
      } else {
        toast.error(res.error || "Kết nối thất bại");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Lỗi khi kiểm tra kết nối";
      setTestResult({ success: false, error: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: GuildSettings["chatbot"] = {
        enabled: formState.enabled,
        provider: formState.provider,
        model: formState.model.trim() || undefined,
        apiKey: formState.apiKey.trim() || undefined,
        baseUrl: formState.baseUrl.trim() || undefined,
        allowedTools: formState.allowedTools,
        readImages: formState.readImages,
        compressImages: formState.compressImages,
      };

      await api.put(API_ROUTES.GUILD_SETTINGS(guildId), { chatbot: payload });
      setData({ ...data, chatbot: payload });
      toast.success("Đã lưu cấu hình Chatbot thành công!");
      setTestResult(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lưu cài đặt thất bại");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setFormState(initialFormState);
    setTestResult(null);
    toast.info("Đã khôi phục cài đặt trước đó");
  };

  const toggleTool = (id: string, on: boolean) => {
    const set = new Set(formState.allowedTools);
    if (on) set.add(id);
    else set.delete(id);
    setFormState((prev) => ({ ...prev, allowedTools: [...set] }));
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Link to Memory */}
      <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">
              Bộ nhớ & Ký ức AI (Guild Memory)
            </h4>
            <p className="text-xs text-muted-foreground">
              Xem các thông tin AI tự động ghi nhớ từ ngữ cảnh trò chuyện hoặc tự
              thêm các sự thật về server.
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1.5 shrink-0">
          <Link to={`/admin/${guildId}/settings/memory`}>
            Quản lý Ký ức
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Cấu hình Chatbot AI
            </CardTitle>
            {loadingConfig && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Đang nạp cấu hình...
              </span>
            )}
          </div>
          <CardDescription>
            Tự động trả lời khi được tag tên trong Discord. Hỗ trợ đa nguồn AI,
            nhận diện hình ảnh, cấp API Key riêng và quản lý quyền công cụ.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Master Switch */}
          <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Bật Chatbot AI</Label>
                <Badge
                  variant={formState.enabled ? "default" : "secondary"}
                  className="text-xs"
                >
                  {formState.enabled ? "Đang bật" : "Đang tắt"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Cho phép bot phản hồi thông minh khi thành viên nhắc đến (@tag)
                trong các kênh chat.
              </p>
            </div>
            <Switch
              checked={formState.enabled}
              onCheckedChange={(enabled) =>
                setFormState((prev) => ({ ...prev, enabled }))
              }
            />
          </div>

          {formState.enabled && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <ProviderSelector
                currentProvider={formState.provider}
                providers={config?.providers ?? []}
                onSelect={handleProviderSelect}
              />

              <CredentialsSection
                provider={formState.provider}
                apiKey={formState.apiKey}
                baseUrl={formState.baseUrl}
                hasSystemKey={currentProviderInfo?.hasSystemKey}
                onChangeApiKey={(apiKey) =>
                  setFormState((prev) => ({ ...prev, apiKey }))
                }
                onChangeBaseUrl={(baseUrl) =>
                  setFormState((prev) => ({ ...prev, baseUrl }))
                }
              />

              <ModelSelector
                provider={formState.provider}
                model={formState.model}
                availableModels={availableModels}
                isRefreshingModels={isRefreshingModels}
                onFetchModels={handleFetchModels}
                onChangeModel={(model) =>
                  setFormState((prev) => ({ ...prev, model }))
                }
              />

              <ConnectionTester
                isTesting={isTesting}
                testResult={testResult}
                onTest={handleTestConnection}
              />

              <VisionSection
                readImages={formState.readImages}
                compressImages={formState.compressImages}
                onChangeReadImages={(readImages) =>
                  setFormState((prev) => ({ ...prev, readImages }))
                }
                onChangeCompressImages={(compressImages) =>
                  setFormState((prev) => ({ ...prev, compressImages }))
                }
              />

              <ToolsSelector
                allowedTools={formState.allowedTools}
                onToggleTool={toggleTool}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <FloatingSaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />
    </div>
  );
}
