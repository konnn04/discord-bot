import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Server, Clock, Cpu } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { User } from "@shared/types/api.types";

interface BotStats {
    guilds: number;
    users: number;
    uptime: number;
    memory: string;
    nodeVersion: string;
    platform: string;
}

export default function BotManagement() {
    const [stats, setStats] = useState<BotStats | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAccess = async () => {
             try {
                 const user = await api.fetch<User>('/auth/me');
                 if (!user.isDeveloper) {
                     navigate("/dashboard");
                     return;
                 }
                 
                 const data = await api.fetch<BotStats>('/admin/stats');
                 setStats(data);
             } catch (err) {
                 console.error(err);
                 toast.error("Failed to load admin stats");
                 navigate("/dashboard");
             } finally {
                 setLoading(false);
             }
        };
        checkAccess();
    }, [navigate]);

    const formatUptime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    };

    if (loading) return <div className="p-8 text-center">Loading admin panel...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Bot Management</h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Guilds</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.guilds}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.users}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats ? formatUptime(stats.uptime) : '-'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.memory}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>System Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between border-b pb-2">
                        <span className="font-medium">Node Version</span>
                        <span>{stats?.nodeVersion}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                        <span className="font-medium">Platform</span>
                        <span>{stats?.platform}</span>
                    </div>
                </CardContent>
            </Card>

            <div className="flex gap-4">
                <Button variant="destructive" onClick={() => toast.info("Restart feature not implemented yet")}>
                    Restart Bot
                </Button>
            </div>
        </div>
    );
}
