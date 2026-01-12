import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { socket } from "@/lib/socket";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, Square, Repeat, Volume2, ListMusic, Loader2, Search, Plus, Mic2, Disc } from "lucide-react";
import type { MusicState, Guild } from "@shared/types/api.types";
import { toast } from "sonner";
// --- Utility ---
function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// --- Components ---

const SearchDialog = ({ guildId }: { guildId: string }) => {
    const [query, setQuery] = useState("");
    const [link, setLink] = useState("");
    const [results, setResults] = useState<{ title: string; url: string; thumbnail?: string; artist?: string; author?: string; durationFormatted?: string; }[]>([]);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const [isPlaylist, setIsPlaylist] = useState(false);
    const [addPlaylist, setAddPlaylist] = useState(true);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearching(true);
        try {
            const data = await api.fetch<{ title: string; url: string; thumbnail?: string; artist?: string; author?: string; durationFormatted?: string; }[]>(`/music/search?q=${encodeURIComponent(query)}`);
            setResults(data)
        } catch (e) {
            console.error(e);
            toast.error((e as any).error || "Failed to search for song.");
        } finally {
            setSearching(false);
        }
    };

    const handleAdd = async (url: string, forceSingle: boolean = false) => {
        try {
            await api.fetch(`/music/${guildId}/play`, {
                method: "POST",
                body: JSON.stringify({ query: url, forceSingle }),
            }).then(() => {
                setOpen(false);
                setQuery("");
                setLink("");
                setResults([]);
                toast.success("Added to queue!");
            }).catch((e) => {
                console.error(e)
                toast.error((e as any).error || "Failed to add song to queue.");
            });
        } catch (e) {
            console.error(e);
            toast.error("Failed to add song to queue.");
        }
    };

    // Regex Check
    useEffect(() => {
        const ytPlaylist = /[?&]list=([^#&?]+)/;
        const spotifyPlaylist = /open\.spotify\.com\/(album|playlist)/;
        
        if (ytPlaylist.test(link) || spotifyPlaylist.test(link)) {
            setIsPlaylist(true);
        } else {
            setIsPlaylist(false);
        }
    }, [link]);

    const isValidLink = (url: string) => {
        const yt = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/;
        const sp = /^(https?:\/\/)?(open\.spotify\.com)\/.+$/;
        return yt.test(url) || sp.test(url);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Song</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Add Song to Queue</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="search" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="search">Search</TabsTrigger>
                        <TabsTrigger value="link">Direct Link</TabsTrigger>
                    </TabsList>

                    <TabsContent value="search">
                        <div className="flex gap-2 mb-4">
                            <Input 
                                placeholder="Search by keyword..." 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Button onClick={handleSearch} disabled={searching}>
                                {searching ? <Loader2 className="animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                             {results.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer" onClick={() => handleAdd(item.url)}>
                                    <div className="h-12 w-12 bg-muted flex-shrink-0 overflow-hidden rounded">
                                        {item.thumbnail && <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{item.title}</div>
                                        <div className="text-xs text-muted-foreground">{item.artist || item.author} • {item.durationFormatted}</div>
                                    </div>
                                    <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
                                </div>
                            ))}
                             {results.length === 0 && !searching && query && (
                                 <div className="text-center text-muted-foreground py-4">No results found.</div>
                             )}
                        </div>
                    </TabsContent>

                    <TabsContent value="link" className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Video or Playlist URL</label>
                            <Input 
                                placeholder="https://youtube.com/watch?v=..." 
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                            />
                            {!isValidLink(link) && link && <p className="text-xs text-destructive">Invalid YouTube or Spotify link</p>}
                        </div>

                        {isPlaylist && isValidLink(link) && (
                            <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/50">
                                <input 
                                    type="checkbox" 
                                    id="add-playlist" 
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={addPlaylist}
                                    onChange={(e) => setAddPlaylist(e.target.checked)}
                                />
                                <label
                                    htmlFor="add-playlist"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Add entire playlist
                                </label>
                            </div>
                        )}

                        <Button 
                            className="w-full" 
                            disabled={!link || !isValidLink(link)} 
                            onClick={() => handleAdd(link, !addPlaylist)}
                        >
                            <Plus className="mr-2 h-4 w-4" /> 
                            {isPlaylist && addPlaylist ? "Add Playlist" : "Add Track"}
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

const LyricsTab = ({ guildId, currentSong, position }: { guildId: string, currentSong: any, position: number }) => {
    const [lyrics, setLyrics] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);

    // Fetch lyrics when song changes
    useEffect(() => {
        if (!currentSong) {
            setLyrics(null);
            return;
        }

        const fetchLyrics = async () => {
            setLoading(true);
            try {
                const data = await api.fetch<{ lyrics: any }>(`/music/${guildId}/lyrics`);
                setLyrics(data.lyrics || "No lyrics found.");
            } catch {
                setLyrics("Failed to load lyrics.");
            } finally {
                setLoading(false);
            }
        };
        fetchLyrics();
    }, [guildId, currentSong?.title]);

    // Auto-scroll
    useEffect(() => {
        if (activeLineRef.current && scrollAreaRef.current) {
            activeLineRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [position, lyrics]);

    if (loading) return <div className="flex h-full items-center justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
    
    if (!lyrics || typeof lyrics === 'string') {
        const text = typeof lyrics === 'string' ? lyrics : "No lyrics available";
        return (
            <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground whitespace-pre-wrap leading-loose">
               {text}
            </div>
        );
    }

    if (Array.isArray(lyrics)) {
        return (
            <ScrollArea className="max-h-[75vh] h-full w-full px-8" ref={scrollAreaRef}>
                <div className="space-y-6 py-8 text-center">
                    {lyrics.map((line: any, i: number) => {
   
                        
                        let lineTime = line.seconds !== undefined ? line.seconds : line.time;
                        
                        if (lineTime > 1000 && !line.seconds) lineTime = lineTime / 1000;
                        
                        const nextLineTime = lyrics[i+1] ? (lyrics[i+1].seconds !== undefined ? lyrics[i+1].seconds : (lyrics[i+1].time > 1000 ? lyrics[i+1].time / 1000 : lyrics[i+1].time)) : Infinity;

                        const isActive = lineTime <= position && nextLineTime > position;
                         
                         return (
                            <div 
                                key={i} 
                                ref={isActive ? activeLineRef : null}
                                className={`transition-all duration-300 py-2 cursor-pointer ${isActive ? "scale-105 text-primary font-bold opacity-100" : "text-muted-foreground opacity-50 hover:opacity-80 scale-100"}`}
                                onClick={() => {
                                }}
                            >
                                <p className="text-xl sm:text-2xl leading-relaxed">{line.text}</p>
                            </div>
                         );
                    })}
                </div>
            </ScrollArea>
        );
    }

    return null;
};

const QueueTab = ({ queue, onRemove }: { queue: any[], onRemove: (index: number) => void }) => {
    if (queue.length === 0) return <div className="flex h-full items-center justify-center text-muted-foreground p-8">Queue is empty</div>;

    return (
        <ScrollArea className="h-[500px] pr-4">
             <div className="space-y-2">
                {queue.map((song, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors group border border-transparent hover:border-border">
                        <div className="w-6 text-center text-muted-foreground font-mono text-sm">{i + 1}</div>
                        <div className="h-10 w-10 rounded bg-muted overflow-hidden flex-shrink-0">
                            {song.thumbnail ? <img src={song.thumbnail} alt="" className="w-full h-full object-cover" /> : <Disc className="h-6 w-6 m-2 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">{song.title}</div>
                            <div className="text-xs text-muted-foreground truncate">{song.author}</div>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{song.durationFormatted}</div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={() => onRemove(i + 1)}>
                            <Square className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
};

// --- Main Music Player ---

const MusicPlayer = ({ guildId }: { guildId: string }) => {
    const [state, setState] = useState<MusicState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [position, setPosition] = useState(0); // In Milliseconds for interpolation

    const fetchState = useCallback(async () => {
        try {
            const data = await api.fetch<MusicState>(`/music/${guildId}/state`);
            setState(data);
            if (data?.position) setPosition(data.position);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [guildId]);

    useEffect(() => {
        fetchState();
        socket.connect();
        socket.joinGuild(guildId);

        const handleUpdate = (...args: unknown[]) => {
            const data = args[0] as { state?: Partial<MusicState>; [key: string]: unknown };
            if (data?.state) {
                setState(prev => {
                    const newState = data.state as MusicState;
                    
                    const eventType = (args[0] as any)?.type;
                    const shouldUpdatePosition = 
                        !prev?.playing ||
                        !newState.playing ||
                        eventType === 'track_start' ||
                        (newState.position !== undefined && newState.position > position);
                    
                    if (newState.position !== undefined && shouldUpdatePosition) {
                        setPosition(newState.position);
                    }
                    
                    if (!prev) return newState;
                    return { ...prev, ...newState };
                });
            } else {
                fetchState();
            }
        };

        socket.on('music:state_update', handleUpdate);
        socket.on('music:queue_add', handleUpdate);
        socket.on('music:track_start', handleUpdate);

        return () => {
            socket.leaveGuild(guildId);
            socket.off('music:state_update', handleUpdate);
            socket.off('music:queue_add', handleUpdate);
            socket.off('music:track_start', handleUpdate);
        };
    }, [guildId, fetchState, position]);

    // Timer Interpolation
    useEffect(() => {
        let interval: ReturnType<typeof setTimeout>;
        if (state?.playing) {
            interval = setInterval(() => {
                setPosition(prev => prev + 200);
            }, 200);
        }
        return () => clearInterval(interval);
    }, [state?.playing]);

    const control = async (action: string, value?: number | boolean) => {
        try {
            await api.fetch(`/music/${guildId}/control`, {
                method: "POST",
                body: JSON.stringify({ action, value }),
            });
            if (action === 'pause') setState(prev => prev ? { ...prev, playing: false } : null);
            if (action === 'play') setState(prev => prev ? { ...prev, playing: true } : null);
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading && !state) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    if (!state) return <div className="text-center p-20 text-muted-foreground">Failed to load music state.</div>;

    const currentDuration = state.currentSong?.duration || 1; // Seconds
    const currentPositionSeconds = position / 1000;
    const progressPercent = Math.min((currentPositionSeconds / currentDuration) * 100, 100);

    return (
        <div className="grid xl:grid-cols-2 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
            {/* Left Column: Player Controls */}
            <div className="flex flex-col gap-6">
                <Card className="flex-1 flex flex-col justify-center border-none bg-gradient-to-b from-muted/50 to-muted/10 shadow-lg">
                   <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center space-y-8">
                        {/* Album Art */}
                        <div className="relative group w-full max-w-sm aspect-square shadow-2xl rounded-2xl overflow-hidden bg-black/50 border border-white/5">
                             {state.currentSong?.thumbnail ? (
                                 <img src={state.currentSong.thumbnail} alt="Art" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                             ) : (
                                 <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                                     <ListMusic className="w-24 h-24 opacity-20" />
                                 </div>
                             )}
                             {/* Overlay */}
                             <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                 {state.playing && (
                                     <div className="flex gap-1.5 items-end h-16 pointer-events-none">
                                         {[...Array(4)].map((_, i) => (
                                             <div key={i} className="w-2.5 bg-white/80 animate-pulse rounded-full" style={{ height: `${40 + Math.random() * 60}%`, animationDuration: `${0.4 + Math.random() * 0.4}s` }} />
                                         ))}
                                     </div>
                                 )}
                             </div>
                        </div>

                        {/* Song Info */}
                        <div className="space-y-2 w-full max-w-md">
                            <h2 className="text-2xl sm:text-3xl font-bold truncate leading-tight">{state.currentSong?.title || "Not Playing"}</h2>
                            <p className="text-lg text-muted-foreground truncate font-medium">{state.currentSong?.artist || state.currentSong?.author || "Idle"}</p>
                        </div>

                        {/* Progress */}
                        <div className="w-full max-w-md space-y-2">
                             <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                 <div className="h-full bg-primary transition-all duration-1000 ease-linear rounded-full" style={{ width: `${progressPercent}%` }} />
                             </div>
                             <div className="flex justify-between text-xs font-mono text-muted-foreground/80">
                                 <span>{formatTime(currentPositionSeconds)}</span>
                                 <span>{formatTime(currentDuration)}</span>
                             </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-6 sm:gap-8">
                             <Button variant="ghost" size="icon" className={`h-10 w-10 ${state.loop ? "text-primary" : "text-muted-foreground"}`} onClick={() => control("loop")}>
                                 <Repeat className="h-5 w-5" />
                             </Button>
                             <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full" onClick={() => control("previous")}>
                                 <SkipForward className="h-5 w-5 rotate-180" />
                             </Button>
                             <Button size="icon" className="h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-transform" onClick={() => control(state.playing ? "pause" : "play")}>
                                 {state.playing ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                             </Button>
                             <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full" onClick={() => control("skip")}>
                                 <SkipForward className="h-5 w-5" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive" onClick={() => control("stop")}>
                                 <Square className="h-5 w-5" />
                             </Button>
                        </div>
                        
                        {/* Volume */}
                        <div className="flex items-center gap-3 w-full max-w-[200px] group">
                             <Volume2 className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                             <Slider 
                                 defaultValue={[state.volume]} 
                                 max={100} 
                                 step={1} 
                                 onValueCommit={(val) => control("volume", val[0])}
                                 className="cursor-pointer"
                             />
                        </div>
                   </CardContent>
                </Card>
            </div>

            {/* Right Column: Queue & Lyrics */}
            <Card className="flex flex-col border-none shadow-lg h-full">
                <Tabs defaultValue="queue" className="flex flex-col h-full">
                    <div className="flex items-center justify-between px-6 pt-6 pb-2">
                        <TabsList className="grid w-[200px] grid-cols-2">
                            <TabsTrigger value="queue">Queue</TabsTrigger>
                            <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
                        </TabsList>
                        <SearchDialog guildId={guildId} />
                    </div>
                    
                    <div className="flex-1 overflow-hidden p-6 pt-2">
                         <TabsContent value="queue" className="h-full mt-0 data-[state=active]:flex flex-col">
                             <div className="flex items-center justify-between mb-4">
                                 <h3 className="font-semibold text-lg flex items-center gap-2"><ListMusic className="h-5 w-5" /> Up Next</h3>
                                 <Badge variant="outline">{state.queue.length} songs</Badge>
                             </div>
                             <QueueTab queue={state.queue} onRemove={(idx) => control("remove", idx)} />
                         </TabsContent>
                         <TabsContent value="lyrics" className="h-full mt-0 data-[state=active]:flex flex-col">
                             <div className="flex items-center justify-between mb-4">
                                 <h3 className="font-semibold text-lg flex items-center gap-2"><Mic2 className="h-5 w-5" /> Lyrics</h3>
                             </div>
                             <LyricsTab guildId={guildId} currentSong={state.currentSong} position={currentPositionSeconds} />
                         </TabsContent>
                    </div>
                </Tabs>
            </Card>
        </div>
    );
};

// --- Page Wrapper ---

export default function MusicPage() {
    const { guildId } = useParams();
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [loading, setLoading] = useState(!guildId); 
    const navigate = useNavigate();

    useEffect(() => {
        if (!guildId) {
            api.fetch<Guild[]>("/guilds/").then(data => {
                setGuilds(data);
                setLoading(false);
            });
        }
    }, [guildId]);

    if (!guildId) {
        return (
            <div className="max-w-6xl mx-auto container p-8">
                <h1 className="text-3xl font-bold mb-8">Select Server for Music</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? <Loader2 className="animate-spin text-primary" /> : guilds.map(g => (
                        <Card key={g.id} className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all" onClick={() => navigate(`/dashboard/music/${g.id}`)}>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-muted border-2 border-muted shadow-sm">
                                    {g.icon ? <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt={g.name} className="w-full h-full object-cover" /> : null}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <CardTitle className="text-lg truncate">{g.name}</CardTitle>
                                    <CardDescription>{g.isAdmin ? "Admin" : "Member"}</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-[80vh] w-full p-4 mx-auto">
            <MusicPlayer guildId={guildId} />
        </div>
    );
}
