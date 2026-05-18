import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuildStore } from "@/stores/guild.store";
import { Music, ChevronRight } from "lucide-react";

export function MusicSelectPage() {
  const navigate = useNavigate();
  const { guilds, isLoading, fetchGuilds } = useGuildStore();

  useEffect(() => {
    fetchGuilds();
  }, [fetchGuilds]);

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Music Player</h1>
        <p className="text-muted-foreground">Chọn server để điều khiển nhạc</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : guilds.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Music className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Chưa có server nào</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Bot chưa tham gia server nào. Hãy mời bot vào server trước.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guilds.map((guild) => (
            <Card
              key={guild.id}
              className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => navigate(`/music/${guild.id}`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-12 w-12 rounded-xl">
                  <AvatarImage src={guild.icon} />
                  <AvatarFallback className="rounded-xl text-lg">
                    {guild.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{guild.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {guild.memberCount} thành viên
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
