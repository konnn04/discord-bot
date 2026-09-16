import type { Blocker } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Props {
  blocker: Blocker;
  onSave: () => Promise<void> | void;
  isSaving?: boolean;
}

/** Confirmation dialog shown when navigating away from a settings page with unsaved changes. */
export function UnsavedChangesDialog({ blocker, onSave, isSaving }: Props) {
  if (blocker.state !== "blocked") return null;

  return (
    <AlertDialog open onOpenChange={(open) => !open && blocker.reset()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bạn có thay đổi chưa lưu</AlertDialogTitle>
          <AlertDialogDescription>
            Rời khỏi trang này sẽ làm mất các thay đổi chưa lưu. Hãy lưu lại
            hoặc hủy các thay đổi trước khi chuyển tab khác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset()}>
            Ở lại trang
          </AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => blocker.proceed()}
          >
            Hủy thay đổi & rời đi
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={async () => {
              await onSave();
              blocker.proceed();
            }}
            className="gap-1.5"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu & rời đi
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
