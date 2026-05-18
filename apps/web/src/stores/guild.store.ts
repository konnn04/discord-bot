import { create } from "zustand";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { GuildInfo, GuildStats } from "@/lib/types";

interface GuildState {
  guilds: GuildInfo[];
  selectedGuild: GuildInfo | null;
  guildStats: GuildStats | null;
  isLoading: boolean;
  fetchGuilds: () => Promise<void>;
  selectGuild: (guild: GuildInfo) => void;
  fetchGuildStats: (guildId: string) => Promise<void>;
}

export const useGuildStore = create<GuildState>((set) => ({
  guilds: [],
  selectedGuild: null,
  guildStats: null,
  isLoading: false,

  fetchGuilds: async () => {
    set({ isLoading: true });
    try {
      const guilds = await api.get<GuildInfo[]>(API_ROUTES.GUILDS);
      set({ guilds, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  selectGuild: (guild: GuildInfo) => {
    set({ selectedGuild: guild });
  },

  fetchGuildStats: async (guildId: string) => {
    try {
      const stats = await api.get<GuildStats>(API_ROUTES.GUILD_STATS(guildId));
      set({ guildStats: stats });
    } catch {
      // stats may not be available
    }
  },
}));
