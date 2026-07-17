import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type {
  GuildChannelInfo,
  GuildRoleInfo,
} from "shared/src/types/api.types";

const channelCache = new Map<string, Promise<GuildChannelInfo[]>>();
const roleCache = new Map<string, Promise<GuildRoleInfo[]>>();

function loadChannels(guildId: string): Promise<GuildChannelInfo[]> {
  let cached = channelCache.get(guildId);
  if (!cached) {
    cached = api
      .get<GuildChannelInfo[]>(API_ROUTES.GUILD_CHANNELS(guildId))
      .catch((err) => {
        channelCache.delete(guildId); // allow retry on failure
        throw err;
      });
    channelCache.set(guildId, cached);
  }
  return cached;
}

function loadRoles(guildId: string): Promise<GuildRoleInfo[]> {
  let cached = roleCache.get(guildId);
  if (!cached) {
    cached = api
      .get<GuildRoleInfo[]>(API_ROUTES.GUILD_ROLES(guildId))
      .catch((err) => {
        roleCache.delete(guildId);
        throw err;
      });
    roleCache.set(guildId, cached);
  }
  return cached;
}

interface Resource<T> {
  data: T[];
  loading: boolean;
  error: boolean;
}

export function useGuildChannels(guildId: string): Resource<GuildChannelInfo> {
  const [state, setState] = useState<Resource<GuildChannelInfo>>({
    data: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ data: [], loading: true, error: false });
    loadChannels(guildId)
      .then((data) => active && setState({ data, loading: false, error: false }))
      .catch(() => active && setState({ data: [], loading: false, error: true }));
    return () => {
      active = false;
    };
  }, [guildId]);

  return state;
}

export function useGuildRoles(guildId: string): Resource<GuildRoleInfo> {
  const [state, setState] = useState<Resource<GuildRoleInfo>>({
    data: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ data: [], loading: true, error: false });
    loadRoles(guildId)
      .then((data) => active && setState({ data, loading: false, error: false }))
      .catch(() => active && setState({ data: [], loading: false, error: true }));
    return () => {
      active = false;
    };
  }, [guildId]);

  return state;
}
