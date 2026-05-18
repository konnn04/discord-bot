import { createContext, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Music, LayoutDashboard, Search, X } from "lucide-react";

document.title = "FoxyBot - Music Player";

export interface MusicSearchContext {
  query: string;
  isPlaylist: boolean;
  setQuery: (q: string) => void;
  setIsPlaylist: (v: boolean) => void;
  isSearchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const MusicSearchCtx = createContext<MusicSearchContext>(null!);

export function MusicLayout() {
  const location = useLocation();
  const isPlayer = location.pathname.split("/").length > 2;

  const [query, setQuery] = useState("");
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b px-4">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to={isPlayer ? "/music" : "/admin"}>
            {isPlayer ? (
              <>
                <Music className="h-4 w-4" />
                <span>Đổi server</span>
              </>
            ) : (
              <>
                <LayoutDashboard className="h-4 w-4" />
                <span>Admin</span>
              </>
            )}
          </Link>
        </Button>

        {isPlayer && (
          <div className="mx-auto flex max-w-xl flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm bài hát hoặc dán link..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!isSearchOpen) setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className="pl-9 pr-8"
              />
              {query && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => { setQuery(""); setSearchOpen(false); }}
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
              <Checkbox
                id="playlist-mode"
                checked={isPlaylist}
                onCheckedChange={(v) => setIsPlaylist(!!v)}
              />
              <label htmlFor="playlist-mode" className="cursor-pointer">Playlist</label>
            </div>
          </div>
        )}

        <ThemeToggle />
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet
          context={
            { query, isPlaylist, setQuery, setIsPlaylist, isSearchOpen, setSearchOpen } satisfies MusicSearchContext
          }
        />
      </main>
    </div>
  );
}
