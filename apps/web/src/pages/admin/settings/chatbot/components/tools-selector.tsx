import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { CHATBOT_TOOLS } from "shared/src/types/settings.types";

interface Props {
  allowedTools: string[];
  onToggleTool: (id: string, on: boolean) => void;
}

export function ToolsSelector({ allowedTools, onToggleTool }: Props) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
          6
        </span>
        Công cụ AI được phép gọi (Tools & Functions)
      </Label>
      <div className="space-y-2">
        {CHATBOT_TOOLS.map((tool) => {
          const on = allowedTools.includes(tool.id);
          return (
            <div
              key={tool.id}
              className="flex items-center justify-between gap-4 rounded-xl border p-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{tool.label}</span>
                  {tool.risky && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px]"
                    >
                      <ShieldAlert className="h-3 w-3" />
                      Nhạy cảm
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tool.description}
                </p>
              </div>
              <Switch
                checked={on}
                onCheckedChange={(v) => onToggleTool(tool.id, v)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
