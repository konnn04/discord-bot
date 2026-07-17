import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorDot } from "@/components/shared/color-dot";
import {
  useGuildOptions,
  DEFAULT_TEXT_TYPES,
  type GuildResourceKind,
} from "@/hooks/use-guild-options";

const NONE = "__none__";

interface BaseProps {
  guildId: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
}

interface SingleSelectProps extends BaseProps {
  kind: GuildResourceKind;
  channelTypes?: number[];
  loadingText: string;
  errorText: string;
}

/** Shared single-select over a guild's channels or roles. */
function GuildSingleSelect({
  guildId,
  value,
  onChange,
  placeholder,
  clearable = true,
  disabled,
  kind,
  channelTypes = DEFAULT_TEXT_TYPES,
  loadingText,
  errorText,
}: SingleSelectProps) {
  const { options, loading, error } = useGuildOptions(
    guildId,
    kind,
    channelTypes,
  );

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
      disabled={disabled || loading}
    >
      <SelectTrigger>
        <SelectValue placeholder={loading ? loadingText : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {clearable && <SelectItem value={NONE}>— Không chọn —</SelectItem>}
        {error && (
          <SelectItem value="__err__" disabled>
            {errorText}
          </SelectItem>
        )}
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            <span className="inline-flex items-center gap-2">
              {o.color !== undefined && <ColorDot color={o.color} />}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface ChannelSelectProps extends BaseProps {
  /** discord.js ChannelType numbers to include. Defaults to text channels. */
  channelTypes?: number[];
}

export function GuildChannelSelect({
  placeholder = "Chọn kênh...",
  ...props
}: ChannelSelectProps) {
  return (
    <GuildSingleSelect
      {...props}
      kind="channel"
      placeholder={placeholder}
      loadingText="Đang tải kênh..."
      errorText="Không tải được danh sách kênh"
    />
  );
}

export function GuildRoleSelect({
  placeholder = "Chọn role...",
  ...props
}: BaseProps) {
  return (
    <GuildSingleSelect
      {...props}
      kind="role"
      placeholder={placeholder}
      loadingText="Đang tải role..."
      errorText="Không tải được danh sách role"
    />
  );
}
