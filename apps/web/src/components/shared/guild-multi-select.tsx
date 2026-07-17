import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ColorDot } from "@/components/shared/color-dot";
import {
  useGuildOptions,
  DEFAULT_TEXT_TYPES,
  type GuildResourceKind,
} from "@/hooks/use-guild-options";

interface GuildMultiSelectProps {
  guildId: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** Which resource to list. */
  kind: GuildResourceKind;
  /** Maximum number of selections. Defaults to 5 (perf-friendly). */
  max?: number;
  placeholder?: string;
  /** discord.js ChannelType numbers to include (channel kind only). */
  channelTypes?: number[];
}

export function GuildMultiSelect({
  guildId,
  values,
  onChange,
  kind,
  max = 5,
  placeholder = "Chọn...",
  channelTypes = DEFAULT_TEXT_TYPES,
}: GuildMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { options, loading } = useGuildOptions(guildId, kind, channelTypes);

  const selectedOptions = values
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is (typeof options)[number] => Boolean(o));

  const atMax = values.length >= max;

  const toggle = (id: string) => {
    if (values.includes(id)) {
      onChange(values.filter((v) => v !== id));
    } else if (!atMax) {
      onChange([...values, id]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={loading}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-muted-foreground">
              {loading
                ? "Đang tải..."
                : values.length === 0
                  ? placeholder
                  : `${values.length}/${max} đã chọn`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Tìm..." />
            <CommandList>
              <CommandEmpty>Không tìm thấy.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const selected = values.includes(o.id);
                  const disabled = !selected && atMax;
                  return (
                    <CommandItem
                      key={o.id}
                      value={o.label}
                      disabled={disabled}
                      onSelect={() => toggle(o.id)}
                      className={cn(disabled && "opacity-40")}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {o.color !== undefined && (
                        <span className="mr-2">
                          <ColorDot color={o.color} />
                        </span>
                      )}
                      {o.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((o) => (
            <Badge key={o.id} variant="secondary" className="gap-1 pr-1">
              {o.label}
              <button
                type="button"
                onClick={() => toggle(o.id)}
                className="rounded-full outline-none hover:bg-muted"
                aria-label={`Bỏ ${o.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {atMax && (
        <p className="text-xs text-muted-foreground">Tối đa {max} lựa chọn.</p>
      )}
    </div>
  );
}
