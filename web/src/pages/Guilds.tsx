import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Guild } from "@shared/types/api.types";
import { Loader2 } from "lucide-react";

const Guilds = () => {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const data = await api.fetch<Guild[]>("/guilds/");
        setGuilds(data);
      } catch (error) {
        console.error("Failed to fetch guilds", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuilds();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Select a Server</h2>
        <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
      </div>
      
      {guilds.length === 0 ? (
          <div className="text-center text-muted-foreground">
              No servers found where you and the bot share membership.
          </div>
      ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {guilds.map((guild) => (
              <Card key={guild.id} className="transition-all hover:bg-muted/50 hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={guild.icon || ""} alt={guild.name} />
                    <AvatarFallback>{guild.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <CardTitle className="truncate text-base">{guild.name}</CardTitle>
                    <CardDescription className="text-xs">ID: {guild.id}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        {guild.isAdmin && <Badge variant="default">Admin</Badge>}
                        {guild.botInGuild ? (
                            <Badge variant="secondary" className="bg-green-500/15 text-green-600 dark:text-green-400">Bot Added</Badge>
                        ) : (
                            <Badge variant="outline">Invite Bot</Badge>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    {guild.botInGuild ? (
                        <Button className="w-full" onClick={() => navigate(`/dashboard/guilds/${guild.id}`)}>Manage</Button>
                    ) : (
                        <Button variant="outline" className="w-full">Setup</Button>
                    )}
                </CardFooter>
              </Card>
            ))}
          </div>
      )}
    </div>
  );
};

export default Guilds;
