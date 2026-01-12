import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Settings, Trophy, Star, Sparkles, MessageSquare, Mic } from "lucide-react";
import { api } from "@/lib/api";
import type { GuildDetail } from "@shared/types/api.types";

export default function GuildView() {
    const { guildId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<GuildDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const json = await api.fetch<GuildDetail>(`/guilds/${guildId}`);
                setData(json);
            } catch (err) {
                console.error(err);
                // navigate("/dashboard/guilds"); // Redirect on error or show error state
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [guildId, navigate]);

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading stats...</div>;
    if (!data) return <div className="p-8 text-center text-muted-foreground">Guild not found.</div>;

    const { guild, userStats } = data;

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-xl border bg-muted/50 p-6 md:p-10">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
                <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div className="flex items-center gap-4">
                         <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-3xl font-bold shadow-sm md:h-24 md:w-24">
                              {guild.icon ? (
                                  <img src={guild.icon} alt={guild.name} className="h-full w-full rounded-2xl object-cover" />
                              ) : (
                                  <span>{guild.name.charAt(0)}</span>
                              )}
                         </div>
                         <div>
                             <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{guild.name}</h1>
                             <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                                 <UsersIcon className="h-4 w-4" />
                                 <span>{guild.memberCount.toLocaleString()} Members</span>
                             </div>
                         </div>
                    </div>
                    
                    <div className="flex gap-2">
                         <Button variant="outline" onClick={() => navigate("/dashboard/guilds")}>
                             <ArrowLeft className="mr-2 h-4 w-4" />
                             Back
                         </Button>
                         <Button variant="secondary" onClick={() => navigate(`/dashboard/guilds/${guildId}/members`)}>
                             <UsersIcon className="mr-2 h-4 w-4" />
                             Members
                         </Button>
                        {guild.isAdmin && (
                            <Button onClick={() => navigate(`/dashboard/guilds/${guildId}/settings`)}>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Separator />

            {/* Stats Grid */}
            <div>
                <h3 className="mb-4 text-lg font-semibold">Your Activity</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Rank" value={`#${userStats.rank || '—'}`} icon={Trophy} className="text-yellow-500" />
                    <StatCard title="Level" value={userStats.level} icon={Star} className="text-amber-400" />
                    <StatCard title="Total XP" value={userStats.xp?.toLocaleString()} icon={Sparkles} className="text-purple-400" />
                    <StatCard title="Messages" value={userStats.messageCount?.toLocaleString()} icon={MessageSquare} className="text-green-400" />
                    <StatCard title="Voice Time" value={`${Math.ceil((userStats.voiceSeconds || 0) / 60)}m`} icon={Mic} className="text-blue-400" />
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, className }: { title: string, value: string | number, icon: React.ElementType, className?: string }) {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${className}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
