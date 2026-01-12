import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RefreshCw, Power } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@shared/types/api.types";
import { Loader2 } from "lucide-react";

export default function Settings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.fetch<User>("/auth/me").then(u => {
            if (!u.isDeveloper) {
                navigate("/dashboard");
            }
            setLoading(false);
        }).catch(() => navigate("/dashboard"));
    }, [navigate]);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
         <div className="max-w-4xl mx-auto container space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Global Settings</h1>
                <p className="text-muted-foreground">Manage bot instance configurations.</p>
            </div>

            <div className="grid gap-6">
                 {/* Bot Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             System Status
                             <Badge className="bg-green-500 hover:bg-green-600">Online</Badge>
                        </CardTitle>
                        <CardDescription>
                            Current bot performance and uptime.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-lg bg-muted/50 border">
                                <div className="text-xs text-muted-foreground uppercase font-bold">Uptime</div>
                                <div className="text-xl font-mono">14h 23m</div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border">
                                <div className="text-xs text-muted-foreground uppercase font-bold">Memory</div>
                                <div className="text-xl font-mono">256MB</div>
                            </div>
                             <div className="p-4 rounded-lg bg-muted/50 border">
                                <div className="text-xs text-muted-foreground uppercase font-bold">Ping</div>
                                <div className="text-xl font-mono">24ms</div>
                            </div>
                             <div className="p-4 rounded-lg bg-muted/50 border">
                                <div className="text-xs text-muted-foreground uppercase font-bold">Version</div>
                                <div className="text-xl font-mono">v2.0.0</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Administrative Actions</CardTitle>
                        <CardDescription>Dangerous operations. Proceed with caution.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Danger Zone</AlertTitle>
                            <AlertDescription>
                                Restarting the bot will disconnect all voice sessions.
                            </AlertDescription>
                        </Alert>
                        
                        <div className="flex gap-4">
                            <Button variant="outline">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reload Commands
                            </Button>
                            <Button variant="destructive">
                                <Power className="mr-2 h-4 w-4" />
                                Restart Bot
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
