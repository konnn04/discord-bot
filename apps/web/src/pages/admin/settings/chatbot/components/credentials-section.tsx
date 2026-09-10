import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Key, Globe, Eye, EyeOff, RotateCcw } from "lucide-react";

interface Props {
  provider: "agentrouter" | "gemini" | "deepseek";
  apiKey: string;
  baseUrl: string;
  hasSystemKey?: boolean;
  onChangeApiKey: (val: string) => void;
  onChangeBaseUrl: (val: string) => void;
  onClear: () => void;
}

export function CredentialsSection({
  provider,
  apiKey,
  baseUrl,
  hasSystemKey,
  onChangeApiKey,
  onChangeBaseUrl,
  onClear,
}: Props) {
  const [showApiKey, setShowApiKey] = useState(false);

  const getBaseUrlPlaceholder = () => {
    if (provider === "agentrouter") return "https://openrouter.ai/api";
    if (provider === "deepseek") return "https://api.deepseek.com";
    return "Mặc định Google Gemini Endpoint";
  };

  return (
    <div className="space-y-4 rounded-xl border p-4 bg-card/60">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              2
            </span>
            Cấu hình API Key & Base URL (Endpoint)
          </Label>
          <p className="text-xs text-muted-foreground">
            Truyền API Key của bạn trước để có thể tải các mô hình khả dụng từ tài
            khoản. Để trống nếu muốn dùng key mặc định từ .env của máy chủ.
          </p>
        </div>
        {(apiKey || baseUrl) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive shrink-0"
            title="Xóa API Key & Base URL đã nhập, dùng lại mặc định từ ENV"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Xóa cài đặt
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* API Key */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-primary" />
              API Key
            </span>
            {hasSystemKey && !apiKey && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                ✓ Đang dùng key mặc định từ ENV
              </span>
            )}
          </Label>
          <div className="relative">
            <Input
              type={showApiKey ? "text" : "password"}
              placeholder={
                hasSystemKey
                  ? "Dùng key hệ thống (để trống) hoặc dán key riêng..."
                  : "sk-... (Nhập API key cho server này)"
              }
              value={apiKey}
              onChange={(e) => onChangeApiKey(e.target.value)}
              className="pr-10 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Base URL */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            Base URL (Endpoint API)
          </Label>
          <Input
            placeholder={getBaseUrlPlaceholder()}
            value={baseUrl}
            onChange={(e) => onChangeBaseUrl(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
      </div>
    </div>
  );
}
