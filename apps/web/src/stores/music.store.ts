import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { MusicPlayerState, MusicTrack, MusicSocketState } from "@/lib/types";

interface MusicState {
  playerState: MusicPlayerState | null;
  queue: MusicTrack[];
  history: MusicTrack[];
  searchResults: MusicTrack[];
  searchPage: number;
  searchTotalPages: number;
  searchTotal: number;
  isLoading: boolean;
  isSearching: boolean;
  currentGuildId: string | null;
  voiceConnected: boolean;
  voiceChannelName: string | null;
  // Lyrics
  syncedLyrics: string | null;
  plainLyrics: string | null;
  isLoadingLyrics: boolean;

  // WebSocket
  _socket: Socket | null;

  fetchPlayerState: (guildId: string) => Promise<void>;
  fetchQueue: (guildId: string) => Promise<void>;
  fetchVoiceStatus: (guildId: string) => Promise<void>;
  fetchLyrics: (guildId: string) => Promise<void>;
  play: (guildId: string, query: string, username?: string) => Promise<void>;
  search: (guildId: string, query: string, page?: number) => Promise<void>;
  pause: (guildId: string, username?: string) => Promise<void>;
  resume: (guildId: string, username?: string) => Promise<void>;
  skip: (guildId: string, username?: string) => Promise<void>;
  prev: (guildId: string, username?: string) => Promise<void>;
  setVolume: (guildId: string, volume: number, username?: string) => Promise<void>;
  seek: (guildId: string, position: number) => Promise<void>;
  toggleLoop: (guildId: string, username?: string) => Promise<void>;
  toggleShuffle: (guildId: string, username?: string) => Promise<void>;
  removeFromQueue: (guildId: string, trackId: string) => Promise<void>;
  setGuildId: (guildId: string) => void;
  joinVoice: (guildId: string) => Promise<{ success: boolean; message: string }>;
  connectSocket: (guildId: string) => void;
  disconnectSocket: () => void;
  clearSearch: () => void;
}

export const useMusicStore = create<MusicState>((set, get) => ({
  playerState: null,
  queue: [],
  history: [],
  searchResults: [],
  searchPage: 1,
  searchTotalPages: 1,
  searchTotal: 0,
  isLoading: false,
  isSearching: false,
  currentGuildId: null,
  voiceConnected: false,
  voiceChannelName: null,
  syncedLyrics: null,
  plainLyrics: null,
  isLoadingLyrics: false,
  _socket: null,

  fetchPlayerState: async (guildId: string) => {
    set({ isLoading: true });
    try {
      const data = await api.get<MusicSocketState>(API_ROUTES.MUSIC_STATE(guildId));
      set({
        playerState: data.playerState,
        queue: data.queue,
        history: data.history,
        voiceConnected: !!data.voiceChannelId,
        voiceChannelName: data.voiceChannelName,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchQueue: async (guildId: string) => {
    try {
      const data = await api.get<{ queue: MusicTrack[]; history: MusicTrack[] }>(
        API_ROUTES.MUSIC_QUEUE(guildId),
      );
      set({ queue: data.queue, history: data.history });
    } catch { /* ignore */ }
  },

  fetchVoiceStatus: async (guildId: string) => {
    try {
      const data = await api.get<{ connected: boolean; voiceChannelName: string | null }>(
        API_ROUTES.MUSIC_VOICE_STATUS(guildId),
      );
      set({ voiceConnected: data.connected, voiceChannelName: data.voiceChannelName });
    } catch { /* ignore */ }
  },

  play: async (guildId: string, query: string, username?: string) => {
    try {
      await api.post(API_ROUTES.MUSIC_PLAY(guildId), { query, username });
      get().fetchPlayerState(guildId);
      toast.success('Đã thêm vào hàng đợi');
    } catch {
      toast.error('Không thể thêm bài hát');
    }
  },

  search: async (guildId: string, query: string, page = 1) => {
    set({ isSearching: true });
    try {
      const data = await api.get<{
        tracks: MusicTrack[];
        page: number;
        totalPages: number;
        total: number;
      }>(`${API_ROUTES.MUSIC_SEARCH(guildId)}?q=${encodeURIComponent(query)}&limit=50&page=${page}`);
      set({
        searchResults: data.tracks,
        searchPage: data.page,
        searchTotalPages: data.totalPages,
        searchTotal: data.total,
        isSearching: false,
      });
    } catch {
      set({ isSearching: false });
    }
  },

  fetchLyrics: async (guildId: string) => {
    const { playerState } = get();
    const track = playerState?.currentTrack?.title;
    const artist = playerState?.currentTrack?.artist;
    if (!track) return;
    set({ isLoadingLyrics: true, syncedLyrics: null, plainLyrics: null });
    try {
      const params = new URLSearchParams({ track, artist: artist || '' });
      const data = await api.get<{
        syncedLyrics?: string;
        plainLyrics: string;
      }>(`${API_ROUTES.MUSIC_LYRICS(guildId)}?${params}`);
      set({
        syncedLyrics: data.syncedLyrics || null,
        plainLyrics: data.plainLyrics,
        isLoadingLyrics: false,
      });
    } catch {
      set({ isLoadingLyrics: false });
    }
  },

  pause: async (guildId: string, username?: string) => {
    await api.post(API_ROUTES.MUSIC_PAUSE(guildId), { username });
    get().fetchPlayerState(guildId);
    toast('⏸️ Đã tạm dừng');
  },

  resume: async (guildId: string, username?: string) => {
    await api.post(API_ROUTES.MUSIC_RESUME(guildId), { username });
    get().fetchPlayerState(guildId);
    toast('▶️ Đang phát');
  },

  skip: async (guildId: string, username?: string) => {
    await api.post(API_ROUTES.MUSIC_SKIP(guildId), { username });
    get().fetchPlayerState(guildId);
    toast('⏭️ Đã bỏ qua');
  },

  prev: async (guildId: string, username?: string) => {
    await api.post(API_ROUTES.MUSIC_PREV(guildId), { username });
    get().fetchPlayerState(guildId);
    toast('⏮️ Quay lại bài trước');
  },

  setVolume: async (guildId: string, volume: number, username?: string) => {
    await api.put(API_ROUTES.MUSIC_VOLUME(guildId), { volume, username });
  },

  seek: async (guildId: string, position: number) => {
    await api.post(API_ROUTES.MUSIC_SEEK(guildId), { position });
  },

  toggleLoop: async (guildId: string, username?: string) => {
    const res = await api.post<{ loop: string }>(API_ROUTES.MUSIC_LOOP(guildId), { username });
    get().fetchPlayerState(guildId);
    const labels: Record<string, string> = { track: '🔂 Lặp 1 bài', queue: '🔁 Lặp danh sách', off: '➡️ Tắt lặp' };
    toast(labels[res.loop] || 'Đã đổi chế độ lặp');
  },

  toggleShuffle: async (guildId: string, username?: string) => {
    await api.post(API_ROUTES.MUSIC_SHUFFLE(guildId), { username });
    get().fetchPlayerState(guildId);
    toast('🔀 Đã trộn danh sách');
  },

  removeFromQueue: async (guildId: string, trackId: string) => {
    await api.delete(API_ROUTES.MUSIC_QUEUE_REMOVE(guildId, trackId));
    get().fetchPlayerState(guildId);
    toast('🗑️ Đã xóa khỏi hàng đợi');
  },

  setGuildId: (guildId: string) => {
    const prev = get().currentGuildId;
    if (prev === guildId) return;
    set({ currentGuildId: guildId });
    get().connectSocket(guildId);
  },

  joinVoice: async (guildId: string) => {
    try {
      const data = await api.post<{
        message: string;
        voiceChannelId?: string;
        voiceChannelName?: string;
      }>(API_ROUTES.MUSIC_JOIN(guildId), {});
      // Optimistically update voice state, WebSocket will sync exact state
      if (data.voiceChannelName) {
        set({
          voiceConnected: true,
          voiceChannelName: data.voiceChannelName,
        });
      }
      get().fetchPlayerState(guildId);
      toast.success(data.message || 'Đã vào kênh voice');
      return { success: true, message: data.message || 'Đã vào kênh voice' };
    } catch (error: unknown) {
      const msg = (error as { message?: string }).message || 'Không thể kết nối';
      toast.error(msg);
      return { success: false, message: msg };
    }
  },

  connectSocket: (guildId: string) => {
    // Disconnect old socket first
    get().disconnectSocket();

    const socket = io(`${window.location.protocol}//${window.location.host}/music`, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token: localStorage.getItem("foxybot_token") },
    });

    socket.on("connect", () => {
      socket.emit("subscribe", guildId);
    });

    socket.on("state", (data: MusicSocketState) => {
      if (data.guildId !== guildId) return;
      set({
        playerState: data.playerState,
        queue: data.queue,
        history: data.history,
        voiceConnected: !!data.voiceChannelId,
        voiceChannelName: data.voiceChannelName,
      });
    });

    socket.on("disconnect", () => {
      set({ voiceConnected: false });
    });

    set({ _socket: socket as unknown as Socket });
  },

  disconnectSocket: () => {
    const sock = get()._socket;
    if (sock) {
      const gid = get().currentGuildId;
      if (gid) sock.emit("unsubscribe", gid);
      sock.disconnect();
      set({ _socket: null });
    }
  },

  clearSearch: () => {
    set({ searchResults: [] });
  },
}));
