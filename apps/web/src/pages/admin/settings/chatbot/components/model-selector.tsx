import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, ListFilter, PenTool, Cpu } from "lucide-react";
import { POPULAR_MODELS } from "../types";

interface Props {
  provider: "agentrouter" | "gemini" | "deepseek";
  model: string;
  availableModels: string[];
  isRefreshingModels: boolean;
  onFetchModels: () => void;
  onChangeModel: (val: string) => void;
}

export function ModelSelector({
  provider,
  model,
  availableModels,
  isRefreshingModels,
  onFetchModels,
  onChangeModel,
}: Props) {
  const [modelMode, setModelMode] = useState<"select" | "custom">("select");

  const depsKey = `${model}|${availableModels.join(",")}`;
  const [prevDepsKey, setPrevDepsKey] = useState(depsKey);
  if (prevDepsKey !== depsKey) {
    setPrevDepsKey(depsKey);
    if (model && availableModels.length > 0 && !availableModels.includes(model)) {
      setModelMode("custom");
    }
  }

  return (
    <div className="space-y-4 rounded-xl border p-4 bg-card/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              3
            </span>
            Chọn Mô hình AI (Model)
          </Label>
          <p className="text-xs text-muted-foreground">
            Tải danh sách model trực tiếp từ API bằng key vừa nhập, hoặc chọn từ
            danh sách/tự điền model tùy ý.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs border-primary/30 hover:bg-primary/5 text-primary self-start sm:self-auto shrink-0"
          disabled={isRefreshingModels}
          onClick={onFetchModels}
          title="Gọi API lấy danh sách các model khả dụng"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshingModels ? "animate-spin" : ""}`}
          />
          {isRefreshingModels ? "Đang tải từ API..." : "Tải model từ API"}
        </Button>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 border-b pb-3">
        <span className="text-xs text-muted-foreground mr-1">Cách chọn:</span>
        <Button
          type="button"
          size="sm"
          variant={modelMode === "select" ? "secondary" : "ghost"}
          className="h-7 px-2.5 text-xs gap-1.5"
          onClick={() => setModelMode("select")}
        >
          <ListFilter className="h-3 w-3" />
          Chọn từ danh sách ({availableModels.length})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={modelMode === "custom" ? "secondary" : "ghost"}
          className="h-7 px-2.5 text-xs gap-1.5"
          onClick={() => setModelMode("custom")}
        >
          <PenTool className="h-3 w-3" />
          Tự điền tên model
        </Button>
      </div>

      {modelMode === "select" ? (
        <Select
          value={model || availableModels[0] || ""}
          onValueChange={onChangeModel}
        >
          <SelectTrigger className="font-mono text-xs">
            <SelectValue placeholder="Chọn model khả dụng..." />
          </SelectTrigger>
          <SelectContent className="max-h-64 font-mono text-xs">
            {availableModels.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="space-y-3">
          <Input
            placeholder="Nhập mã model (ví dụ: deepseek/deepseek-v4-flash:free)..."
            value={model}
            onChange={(e) => onChangeModel(e.target.value)}
            className="font-mono text-xs"
          />

          {/* Quick chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground mr-1">
              Gợi ý nhanh:
            </span>
            {POPULAR_MODELS[provider]?.map((chip) => (
              <button
                key={chip.name}
                type="button"
                onClick={() => onChangeModel(chip.name)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono border transition-all ${
                  model === chip.name
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                }`}
              >
                <span>{chip.name}</span>
                {chip.tag && (
                  <span className="opacity-70 text-[9px]">({chip.tag})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-muted-foreground">
          Đang chọn:{" "}
          <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-semibold">
            {model || "(chưa thiết lập)"}
          </code>
        </span>
        {modelMode === "select" && (
          <button
            type="button"
            onClick={() => setModelMode("custom")}
            className="text-[11px] text-primary hover:underline"
          >
            Không thấy model của bạn? Tự nhập tay &rarr;
          </button>
        )}
      </div>

      {provider === "agentrouter" && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs space-y-1 text-blue-950 dark:text-blue-200">
          <div className="font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <Cpu className="h-3.5 w-3.5" />
            Lưu ý model OpenRouter:
          </div>
          <p className="text-[11px] opacity-90">
            Tên model theo định dạng{" "}
            <code className="font-mono bg-blue-500/10 px-1 rounded">
              nhà-cung-cấp/tên-model
            </code>{" "}
            (ví dụ:{" "}
            <code className="font-mono bg-blue-500/10 px-1 rounded">
              deepseek/deepseek-v4-flash:free
            </code>
            ). Model này có quota free sẵn sàng dùng ngay.
          </p>
        </div>
      )}
    </div>
  );
}
