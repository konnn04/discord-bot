import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Cpu, Sparkles, Layers, Check } from "lucide-react";
import type { ProviderInfo } from "../types";

interface Props {
  currentProvider: "agentrouter" | "gemini" | "deepseek";
  providers: ProviderInfo[];
  onSelect: (provider: "agentrouter" | "gemini" | "deepseek") => void;
}

export function ProviderSelector({
  currentProvider,
  providers,
  onSelect,
}: Props) {
  const getProviderMeta = (id: string) => providers.find((p) => p.id === id);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
          1
        </span>
        Chọn nguồn AI (Provider)
      </Label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* AgentRouter */}
        <div
          onClick={() => onSelect("agentrouter")}
          className={`cursor-pointer relative flex flex-col justify-between rounded-xl border-2 p-4 transition-all hover:border-primary/60 ${
            currentProvider === "agentrouter"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-muted bg-card hover:bg-accent/40"
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Cpu className="h-4 w-4" />
                </div>
                <span className="font-semibold text-sm">OpenRouter</span>
              </div>
              {currentProvider === "agentrouter" && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              OpenAI Compatible. Cổng đa mô hình (DeepSeek, GPT, Claude, Llama...).
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
            <Badge
              variant="outline"
              className={
                getProviderMeta("agentrouter")?.hasSystemKey
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]"
              }
            >
              {getProviderMeta("agentrouter")?.hasSystemKey
                ? "ENV: Sẵn sàng"
                : "Chưa có ENV"}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              openrouter.ai
            </span>
          </div>
        </div>

        {/* Gemini */}
        <div
          onClick={() => onSelect("gemini")}
          className={`cursor-pointer relative flex flex-col justify-between rounded-xl border-2 p-4 transition-all hover:border-primary/60 ${
            currentProvider === "gemini"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-muted bg-card hover:bg-accent/40"
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="font-semibold text-sm">Google Gemini</span>
              </div>
              {currentProvider === "gemini" && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              Nhanh, thông minh, hỗ trợ function calling và chi phí thấp.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
            <Badge
              variant="outline"
              className={
                getProviderMeta("gemini")?.hasSystemKey
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]"
              }
            >
              {getProviderMeta("gemini")?.hasSystemKey
                ? "ENV: Sẵn sàng"
                : "Chưa có ENV"}
            </Badge>
            <span className="text-[11px] text-muted-foreground">Google API</span>
          </div>
        </div>

        {/* DeepSeek */}
        <div
          onClick={() => onSelect("deepseek")}
          className={`cursor-pointer relative flex flex-col justify-between rounded-xl border-2 p-4 transition-all hover:border-primary/60 ${
            currentProvider === "deepseek"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-muted bg-card hover:bg-accent/40"
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="font-semibold text-sm">DeepSeek</span>
              </div>
              {currentProvider === "deepseek" && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              Mô hình suy luận và lập trình chuyên sâu, tương thích chuẩn OpenAI.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
            <Badge
              variant="outline"
              className={
                getProviderMeta("deepseek")?.hasSystemKey
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]"
              }
            >
              {getProviderMeta("deepseek")?.hasSystemKey
                ? "ENV: Sẵn sàng"
                : "Chưa có ENV"}
            </Badge>
            <span className="text-[11px] text-muted-foreground">DeepSeek API</span>
          </div>
        </div>
      </div>
    </div>
  );
}
