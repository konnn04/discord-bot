import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlayCircle, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { TestResult } from "../types";

interface Props {
  isTesting: boolean;
  testResult: TestResult | null;
  onTest: () => void;
}

export function ConnectionTester({ isTesting, testResult, onTest }: Props) {
  return (
    <div className="space-y-3 rounded-xl border p-4 bg-card/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              4
            </span>
            Kiểm tra kết nối AI
          </Label>
          <p className="text-xs text-muted-foreground">
            Thực hiện gọi thử nghiệm API với provider, key và model đang chọn
            trước khi lưu.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5 self-start sm:self-auto shrink-0"
          disabled={isTesting}
          onClick={onTest}
        >
          {isTesting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <PlayCircle className="h-3.5 w-3.5 text-primary" />
          )}
          {isTesting ? "Đang gọi thử..." : "Kiểm tra kết nối AI"}
        </Button>
      </div>

      {testResult && (
        <div
          className={`rounded-lg border p-3.5 text-xs transition-all ${
            testResult.success
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"
              : "border-destructive/40 bg-destructive/5 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
            <span>
              {testResult.success
                ? `Kết nối thành công (${testResult.latencyMs}ms) - Model: ${testResult.model}`
                : "Lỗi kết nối API"}
            </span>
          </div>
          <div className="mt-1.5 pl-6 font-mono text-[11px] opacity-90 break-words">
            {testResult.success
              ? `Phản hồi mẫu: "${testResult.reply}"`
              : testResult.error}
          </div>
        </div>
      )}
    </div>
  );
}
