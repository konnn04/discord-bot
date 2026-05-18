import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMusicStore } from "@/stores/music.store";
import { useGuildStore } from "@/stores/guild.store";
import { useAuthStore } from "@/stores/auth.store";
import { VOLUME_MAX } from "@/lib/constants";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Music,
  ListMusic,
  MicVocal,
  Disc3,
  GripVertical,
  ExternalLink,
  User,
} from "lucide-react";
import type { MusicSearchContext } from "@/components/layout/music-layout";
import { LyricsPanel } from "@/components/shared/lyrics-panel";
import { toast } from "sonner";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Animated audio wave bars */
function AudioWaves({ active }: { active: boolean }) {
  return (
    <>
      <style>{`
        @keyframes waveBar { 0% { height: 4px; } 100% { height: 24px; } }
      `}</style>
      <div className="flex items-end justify-center gap-0.5 h-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-primary/60"
            style={active
              ? { animation: `waveBar 0.8s ease-in-out infinite alternate`, animationDelay: `${i * 0.12}s` }
              : { height: "4px" }}
          />
        ))}
      </div>
    </>
  );
}

export function MusicPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const { guilds } = useGuildStore();
  const { user } = useAuthStore();
  const activeGuild = guilds.find((g) => g.id === guildId);
  const displayName = user?.displayName || user?.username || "Web User";
  const {
    playerState,
    queue,
    searchResults,
    searchPage,
    searchTotalPages,
    searchTotal,
    isSearching,
    voiceConnected,
    voiceChannelName,
    syncedLyrics,
    plainLyrics,
    isLoadingLyrics,
    fetchPlayerState,
    fetchLyrics,
    search,
    play,
    pause,
    resume,
    skip,
    prev,
    toggleLoop,
    toggleShuffle,
    removeFromQueue,
    setGuildId,
    joinVoice,
    setVolume,
  } = useMusicStore();

  const {
    query,
    isPlaylist: _isPlaylist,
    setIsPlaylist: _setIsPlaylist,
    isSearchOpen,
    setSearchOpen,
  } = useOutletContext<MusicSearchContext>();

  void _isPlaylist;
  void _setIsPlaylist;

  const [isMuted, setIsMuted] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [tickOffset, setTickOffset] = useState(0);
  const tickStartRef = useRef(0);
  const tickBaseRef = useRef(0);
  const animRef = useRef(0);

  // ── Init & socket ──
  useEffect(() => {
    if (guildId) {
      setGuildId(guildId);
      fetchPlayerState(guildId);
    }
    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [guildId, fetchPlayerState, setGuildId]);

  // ── Progress animation (client-side ticking while playing) ──
  useEffect(() => {
    if (playerState?.isPlaying && !playerState.isPaused) {
      tickBaseRef.current = playerState.position ?? 0;
      tickStartRef.current = Date.now();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTickOffset(0);

      const tick = () => {
        const elapsed = (Date.now() - tickStartRef.current) / 1000;
        setTickOffset(elapsed);
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(animRef.current);
    } else {
      setTickOffset(0);
    }
  }, [playerState?.isPlaying, playerState?.isPaused, playerState?.position]);

  // Computed values — no duplicate state
  const serverPosition = playerState?.position ?? 0;
  const progress =
    playerState?.isPlaying && !playerState?.isPaused
      ? serverPosition + tickOffset
      : serverPosition;
  const duration = playerState?.currentTrack?.duration ?? 0;

  // ── Search from header ──
  const handleHeaderSearch = useCallback(() => {
    if (query.trim() && guildId) {
      search(guildId, query.trim());
    }
  }, [query, guildId, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && isSearchOpen && query.trim() && guildId) {
        handleHeaderSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSearchOpen, query, guildId, handleHeaderSearch]);

  // ── Actions ──
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handlePlayTrack = (trackQuery: string) => {
    if (guildId) {
      play(guildId, trackQuery, displayName);
      toast.info(`Đang thêm "${trackQuery}" vào hàng đợi...`);
      setSearchOpen(false);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    setIsMuted(vol === 0);
    // Debounce the API call only
    if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    volumeTimerRef.current = setTimeout(() => {
      if (guildId) setVolume(guildId, vol);
    }, 300);
  };

  const handleMuteToggle = () => {
    if (guildId) {
      if (isMuted) {
        setVolume(guildId, playerState?.volume ?? VOLUME_MAX);
        toast.info("Đã bật tiếng trở lại");
      } else {
        setVolume(guildId, 0);
        toast.info("Đã tắt tiếng");
      }
      setIsMuted(!isMuted);
    }
  };

  const currentTrack = playerState?.currentTrack;
  const loopIcon =
    playerState?.loop === "track" ? (
      <Repeat1 className="h-5 w-5" />
    ) : (
      <Repeat className="h-5 w-5" />
    );
  const isLoopActive = playerState?.loop !== "none";

  // ── Voice channel guard ──
  const showGuard = !voiceConnected;

  const handleJoinVoice = async () => {
    if (!guildId || isJoining) return;
    setIsJoining(true);
    toast.info("Đang gọi bot vào kênh voice của bạn...");
    try {
      await joinVoice(guildId);
      toast.success("Bot đã vào kênh voice của bạn");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-background">
      {/* ═══ Voice Guard Overlay ═══ */}
      {showGuard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-background/60">
          <div className="text-center max-w-md p-8 rounded-2xl bg-card border shadow-xl">
            <Disc3 className="mx-auto mb-4 h-16 w-16 text-muted-foreground animate-spin" />
            <h2 className="text-xl font-bold mb-2">Bot chưa vào kênh voice</h2>
            <p className="text-muted-foreground mb-6">
              Bạn cần vào kênh voice trước, sau đó nhấn nút bên dưới để gọi bot vào kênh của bạn.
            </p>
            <Button
              size="lg"
              className="gap-2"
              onClick={handleJoinVoice}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Disc3 className="h-4 w-4 animate-spin" />
                  Đang vào kênh...
                </>
              ) : (
                <>
                  <Disc3 className="h-4 w-4" />
                  Vào kênh của bạn
                </>
              )}
            </Button>
            <p className="mt-4 text-xs text-muted-foreground/70">
              Bot sẽ tự động rời kênh nếu không có nhạc được phát
            </p>
          </div>
        </div>
      )}

      {/* ═══ Search Results Overlay (hidden, not unmounted) ═══ */}
      <div
        className={`absolute inset-0 z-40 flex flex-col bg-background/95 backdrop-blur-sm transition-all duration-200 ${
          isSearchOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between border-b px-6 py-3">
          <h2 className="text-lg font-semibold">
            Kết quả tìm kiếm{query ? `: "${query}"` : ""}
            {searchTotal > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({searchTotal} kết quả)
              </span>
            )}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setSearchOpen(false)}>
            Đóng
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isSearching ? (
            <div className="flex items-center justify-center py-20">
              <Disc3 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-muted-foreground">
              <Music className="mb-4 h-12 w-12 opacity-30" />
              <p>{query ? "Không tìm thấy kết quả" : "Nhập từ khóa ở thanh tìm kiếm phía trên"}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {searchResults.map((track) => (
                <div
                  key={track.id}
                  className="group flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-accent"
                >
                  <Avatar className="h-12 w-12 shrink-0 rounded">
                    <AvatarImage src={track.thumbnail} />
                    <AvatarFallback>
                      <Music className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{track.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{track.artist}</p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground/70">
                    {formatTime(track.duration)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => {
                      handlePlayTrack(`${track.artist} - ${track.title}`);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {/* Pagination */}
              {searchTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={searchPage <= 1}
                    onClick={() => guildId && search(guildId, query.trim(), searchPage - 1)}
                  >
                    Trước
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {searchPage} / {searchTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={searchPage >= searchTotalPages}
                    onClick={() => guildId && search(guildId, query.trim(), searchPage + 1)}
                  >
                    Sau
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Main 50/50 Layout ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Now Playing 50% ── */}
        <div className="relative flex w-full flex-col items-center justify-center border-r p-6 lg:w-1/2">
          {/* Server & Channel Info */}
          {activeGuild && (
            <div className="absolute left-6 top-6 flex items-center gap-3 rounded-full bg-accent/50 pr-4 p-1.5 border">
              <Avatar className="h-8 w-8 rounded-full border border-background">
                <AvatarImage src={activeGuild.icon} />
                <AvatarFallback>{activeGuild.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-semibold leading-tight">{activeGuild.name}</span>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className={`h-1.5 w-1.5 rounded-full ${voiceConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  {voiceConnected ? voiceChannelName : 'Không trong voice'}
                </div>
              </div>
            </div>
          )}

          {currentTrack ? (
            <div className="flex w-full max-w-md flex-col items-center mt-8">
              {/* Thumbnail */}
              <div className="relative mb-6">
                <Avatar className="h-56 w-56 rounded-2xl shadow-2xl ring-2 ring-border">
                  <AvatarImage src={currentTrack.thumbnail} />
                  <AvatarFallback className="rounded-2xl">
                    <Music className="h-16 w-16 text-muted-foreground/30" />
                  </AvatarFallback>
                </Avatar>
                {/* Spinning disc effect */}
                {!playerState?.isPaused && (
                  <Disc3 className="absolute -top-3 -right-3 h-10 w-10 animate-spin text-primary/40" />
                )}
              </div>

              {/* Title & Artist */}
              <h1 className="text-center text-2xl font-bold leading-tight line-clamp-2">
                <a href={currentTrack.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary transition-colors flex items-center justify-center gap-2">
                  {currentTrack.title}
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-muted-foreground">{currentTrack.artist}</p>
                <span className="text-muted-foreground/60 text-xs">•</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 bg-accent px-2 py-0.5 rounded-full">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-30">{currentTrack.requestedBy}</span>
                </div>
              </div>

              {/* Audio waves */}
              <div className="mt-4">
                <AudioWaves active={!!playerState?.isPlaying && !playerState?.isPaused} />
              </div>

              {/* Progress — read-only (seek not supported by Discord voice) */}
              <div className="mt-8 flex w-full items-center gap-3">
                <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                  {formatTime(progress)}
                </span>
                <div className="relative h-1.5 flex-1 rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    style={{ width: `${Math.min((progress / (duration || 1)) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground w-10">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Controls */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-10 w-10 ${playerState?.shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => guildId && toggleShuffle(guildId, displayName)}
                    >
                      <Shuffle className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Trộn bài</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 text-muted-foreground hover:text-foreground"
                      onClick={() => guildId && prev(guildId, displayName)}
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bài trước</TooltipContent>
                </Tooltip>

                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    if (!guildId) return;
                    if (playerState?.isPaused) resume(guildId, displayName);
                    else pause(guildId, displayName);
                  }}
                >
                  {playerState?.isPaused ? (
                    <Play className="ml-1 h-6 w-6" />
                  ) : (
                    <Pause className="h-6 w-6" />
                  )}
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 text-muted-foreground hover:text-foreground"
                      onClick={() => guildId && skip(guildId, displayName)}
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bài tiếp</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-10 w-10 ${isLoopActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => guildId && toggleLoop(guildId, displayName)}
                    >
                      {loopIcon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {playerState?.loop === "track"
                      ? "Lặp 1 bài"
                      : playerState?.loop === "queue"
                        ? "Lặp danh sách"
                        : "Tắt lặp"}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Volume */}
              <div className="mt-6 flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={handleMuteToggle}
                >
                  {isMuted || (playerState?.volume ?? 0) === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={[playerState?.volume ?? VOLUME_MAX]}
                  max={VOLUME_MAX}
                  step={1}
                  className="w-28"
                  onValueChange={handleVolumeChange}
                />
                <span className="text-xs tabular-nums text-muted-foreground w-8">
                  {playerState?.volume ?? VOLUME_MAX}%
                </span>
              </div>

              {/* Guild & Voice Channel Info */}
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/70">
                {activeGuild && (
                  <div className="flex items-center gap-1.5 rounded-full bg-accent/50 px-2.5 py-1 border">
                    <Avatar className="h-4 w-4 rounded-full">
                      <AvatarImage src={activeGuild.icon} />
                      <AvatarFallback className="text-[8px]">{activeGuild.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground/80">{activeGuild.name}</span>
                  </div>
                )}
                {voiceChannelName && (
                  <div className="flex items-center gap-1.5 rounded-full bg-accent/50 px-2.5 py-1 border">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                    <span>{voiceChannelName}</span>
                  </div>
                )}
                {!voiceChannelName && (
                  <span className="text-muted-foreground/50">Bot chưa vào voice</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <Music className="mb-6 h-20 w-20 text-muted-foreground/20" />
              <h2 className="text-xl font-medium text-muted-foreground">
                Chưa có bài hát nào đang phát
              </h2>
              <p className="mt-2 text-sm text-muted-foreground/70">
                {voiceConnected
                  ? "Tìm kiếm bài hát ở thanh phía trên để bắt đầu"
                  : "Bot chưa vào kênh voice"}
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Tabs (Queue | Lyrics) 50% ── */}
        <div className="hidden w-1/2 flex-col lg:flex">
          <Tabs defaultValue="queue" className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <TabsList variant="line">
                <TabsTrigger value="queue" className="gap-1.5">
                  <ListMusic className="h-4 w-4" />
                  Hàng đợi ({queue.length})
                </TabsTrigger>
                <TabsTrigger value="lyrics" className="gap-1.5">
                  <MicVocal className="h-4 w-4" />
                  Lời bài hát
                </TabsTrigger>
              </TabsList>

              {currentTrack && (
                <div className="text-xs text-muted-foreground">
                  Đang phát: <span className="font-medium text-foreground">{currentTrack.title}</span>
                </div>
              )}
            </div>

            {/* Queue Tab */}
            <TabsContent value="queue" className="flex-1 overflow-hidden data-[state=inactive]:hidden">
              <ScrollArea className="h-full px-4 py-2">
                {queue.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-muted-foreground">
                    <ListMusic className="mb-3 h-10 w-10 opacity-30" />
                    <p className="text-sm">Hàng đợi trống</p>
                    <p className="mt-1 text-xs">Thêm bài hát để bắt đầu</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {queue.map((track, i) => (
                      <div
                        key={`${track.id}-${i}`}
                        className="group flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent"
                      >
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                        <Avatar className="h-10 w-10 shrink-0 rounded">
                          <AvatarImage src={track.thumbnail} />
                          <AvatarFallback>
                            <Music className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{track.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                            <span className="text-[10px] text-muted-foreground/60">•</span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-20">{track.requestedBy}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatTime(track.duration)}
                        </span>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                          >
                            <a href={track.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            onClick={() => guildId && removeFromQueue(guildId, track.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Lyrics Tab */}
            <TabsContent value="lyrics" className="flex-1 overflow-hidden data-[state=inactive]:hidden">
              <LyricsPanel
                currentTrack={currentTrack ?? null}
                syncedLyrics={syncedLyrics}
                plainLyrics={plainLyrics}
                isLoading={isLoadingLyrics}
                fetchLyrics={fetchLyrics}
                guildId={guildId ?? null}
                position={progress}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Bottom Now-Playing Bar ── */}
      {currentTrack && (
        <div className="flex items-center gap-3 border-t bg-card px-4 py-2">
          <Avatar className="h-10 w-10 shrink-0 rounded">
            <AvatarImage src={currentTrack.thumbnail} />
            <AvatarFallback>
              <Music className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{currentTrack.title}</p>
            <p className="truncate text-xs text-muted-foreground">{currentTrack.artist}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => {
              if (!guildId) return;
              if (playerState?.isPaused) resume(guildId, displayName);
              else pause(guildId, displayName);
            }}
          >
            {playerState?.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => guildId && skip(guildId, displayName)}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

