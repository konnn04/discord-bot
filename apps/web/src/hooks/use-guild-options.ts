import { useGuildChannels, useGuildRoles } from "@/hooks/use-guild-resources";

/** A guild channel or role normalized to a single selectable shape. */
export interface GuildOption {
  id: string;
  label: string;
  color?: number; // roles only; decimal color, 0 = none
}

export type GuildResourceKind = "channel" | "role";

// Text-capable channels: GuildText(0), GuildAnnouncement(5), GuildForum(15)
export const DEFAULT_TEXT_TYPES = [0, 5, 15];

interface GuildOptionsState {
  options: GuildOption[];
  loading: boolean;
  error: boolean;
}

/**
 * Single source for "list a guild's channels or roles as options" — fetch,
 * filter, and map in one place so every select (single or multi) shares it.
 */
export function useGuildOptions(
  guildId: string,
  kind: GuildResourceKind,
  channelTypes: number[] = DEFAULT_TEXT_TYPES,
): GuildOptionsState {
  // Both hooks run unconditionally (rules of hooks); we read the relevant one.
  const channels = useGuildChannels(guildId);
  const roles = useGuildRoles(guildId);
  const source = kind === "channel" ? channels : roles;

  const options: GuildOption[] =
    kind === "channel"
      ? channels.data
          .filter((c) => channelTypes.includes(c.type))
          .map((c) => ({ id: c.id, label: `# ${c.name}` }))
      : roles.data
          .filter((r) => !r.managed)
          .map((r) => ({ id: r.id, label: r.name, color: r.color }));

  return { options, loading: source.loading, error: source.error };
}
