import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Music, Server, Terminal, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";

export default function Overview() {
    const [stats, setStats] = useState({
        guilds: 0,
        users: 0,
        ping: 0
    });

    useEffect(() => {
        // Fetch stats if available, otherwise mock or show placeholders
        // For now, we'll just show the user's guild count from the guilds endpoint if possible, 
        // or just static data / separate stats endpoint if strictly needed.
        // Let's try to fetch guilds to count them at least.
        const fetchStats = async () => {
            try {
                const guilds = await api.fetch<{id: string}[]>("/users/@me/guilds");
                setStats(prev => ({ ...prev, guilds: guilds.length }));
            } catch (e) {
                console.error(e);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
                <p className="text-muted-foreground">Welcome to your dashboard.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Servers</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.guilds}</div>
                        <p className="text-xs text-muted-foreground">Manageable guilds</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Online</div>
                        <p className="text-xs text-muted-foreground">All systems operational</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Quick Links</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <Link to="/dashboard/music" className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-muted/50 transition-colors">
                                <Music className="h-8 w-8 mb-2 text-primary" />
                                <span className="font-semibold">Music Player</span>
                            </Link>
                             <Link to="/dashboard/guilds" className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-muted/50 transition-colors">
                                <Users className="h-8 w-8 mb-2 text-primary" />
                                <span className="font-semibold">Manage Guilds</span>
                            </Link>
                             <Link to="/dashboard/commands" className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-muted/50 transition-colors">
                                <Terminal className="h-8 w-8 mb-2 text-primary" />
                                <span className="font-semibold">Commands</span>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
