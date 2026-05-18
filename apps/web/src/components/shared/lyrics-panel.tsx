import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MicVocal } from "lucide-react";
import type { MusicTrack } from "@/lib/types";

interface LyricsPanelProps {
  currentTrack: MusicTrack | null;
  syncedLyrics: string | null;
  plainLyrics: string | null;
  isLoading: boolean;
  fetchLyrics: (guildId: string) => void;
  guildId: string | null;
  /** Current playback position in seconds */
  position: number;
}

interface LrcLine {
  time: number; // seconds
  text: string;
}

/** Parse LRC synced lyrics format: [mm:ss.xx] text */
function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const line of lrc.split("\n")) {
    const match = line.match(/^\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
      lines.push({ time: min * 60 + sec + ms / 1000, text: match[4].trim() });
    }
  }
  return lines;
}

/** Compute the active lyric line index from position + parsed lines (pure, no effect). */
function findActiveIndex(lines: LrcLine[], position: number): number {
  let idx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].time <= position) {
      idx = i;
      break;
    }
  }
  return idx;
}

export function LyricsPanel({
  currentTrack,
  syncedLyrics,
  plainLyrics,
  isLoading,
  fetchLyrics,
  guildId,
  position,
}: LyricsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());
  const [userScrolling, setUserScrolling] = useState(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isUserScroll = useRef(false);

  const lrcLines = useMemo(() => (syncedLyrics ? parseLrc(syncedLyrics) : []), [syncedLyrics]);

  const activeIndex = findActiveIndex(lrcLines, position);

  useEffect(() => {
    if (userScrolling || activeIndex < 0) return;
    const el = lineRefs.current.get(activeIndex);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex, userScrolling]);

  useEffect(() => {
    if (currentTrack && guildId) {
      fetchLyrics(guildId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, guildId, fetchLyrics]);

  const handleScroll = useCallback(() => {
    if (isUserScroll.current) return;
    isUserScroll.current = true;
    setUserScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setUserScrolling(false);
      isUserScroll.current = false;
    }, 5000);
  }, []);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <MicVocal className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm">Chưa có bài hát nào để hiển thị lời</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-6 w-3/4 mx-auto" />
        <Skeleton className="h-6 w-1/2 mx-auto" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  const hasLyrics = syncedLyrics || plainLyrics;

  if (!hasLyrics) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <MicVocal className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm">Không tìm thấy lời bài hát</p>
        <p className="mt-1 text-xs opacity-70">{currentTrack.title}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Track header */}
      <div className="border-b px-6 py-3 text-center">
        <p className="font-semibold line-clamp-1">{currentTrack.title}</p>
        <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
      </div>

      {/* Lyrics content — uses native scroll for onScroll detection */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        <div className="px-6 py-6">
          {lrcLines.length > 0 ? (
            <div className="space-y-4 text-center leading-relaxed">
              {lrcLines.map((line, i) => {
                const isActive = i === activeIndex;
                return (
                  <p
                    key={i}
                    ref={(el) => {
                      if (el) lineRefs.current.set(i, el);
                      else lineRefs.current.delete(i);
                    }}
                    className={`transition-all duration-300 cursor-default ${
                      isActive
                        ? "text-foreground text-xl font-medium opacity-100 scale-100"
                        : "text-foreground text-xl font-medium opacity-40 scale-85"
                    }`}
                  >
                    {line.text || "♫"}
                  </p>
                );
              })}
            </div>
          ) : plainLyrics ? (
            <div className="text-center leading-relaxed whitespace-pre-line text-muted-foregrounmd">
              {plainLyrics}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
