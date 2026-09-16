import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Save } from "lucide-react";

interface Props {
  isDirty: boolean;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

/** Floating bar shown at the bottom of a settings page while it has unsaved changes. */
export function FloatingSaveBar({
  isDirty,
  isSaving,
  onDiscard,
  onSave,
}: Props) {
  if (!isDirty) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-background/95 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 dark:bg-card/95">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
            <AlertCircle className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Cẩn thận — Bạn có thay đổi chưa lưu!
            </p>
            <p className="text-xs text-muted-foreground">
              Các thiết lập sẽ chỉ có hiệu lực sau khi bạn nhấn Lưu thay đổi.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDiscard}
            disabled={isSaving}
            className="h-9 px-3"
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="h-9 px-4 gap-1.5 shadow-md shadow-primary/20 min-w-[110px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Lưu thay đổi
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
