import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { GuildSettings } from "@shared/types/api.types";

export default function GuildSettingsPage() {
    const { guildId } = useParams();
    const navigate = useNavigate();
    const [settings, setSettings] = useState<GuildSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.fetch<GuildSettings>(`/guilds/${guildId}/settings`);
                setSettings(data);
            } catch (err) {
                console.error(err);
                navigate("/dashboard/guilds");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [guildId, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (!settings) return;
        
        let newValue: string | number | boolean = value;
        // Checkboxes only exist on Input elements
        if (type === 'checkbox' && 'checked' in e.target) {
             newValue = (e.target as HTMLInputElement).checked;
        }
        else if (type === 'number') newValue = parseInt(value) || 0;

        setSettings({ ...settings, [name]: newValue });
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await api.fetch(`/guilds/${guildId}/settings`, {
                method: 'PATCH',
                body: JSON.stringify(settings)
            });
            toast.success('Settings saved successfully!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/guilds")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Server Settings</h2>
                    <p className="text-muted-foreground">Manage bot configuration for this server.</p>
                </div>
            </div>
            
            <Separator />

            <div className="grid gap-6">
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>General Settings</CardTitle>
                        <CardDescription>Basic bot configuration.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="prefix">Command Prefix</Label>
                                <Input 
                                    id="prefix" 
                                    name="prefix" 
                                    value={settings?.prefix || ''} 
                                    onChange={handleChange} 
                                    placeholder="!" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="language">Language</Label>
                                <select 
                                    id="language"
                                    name="language"
                                    value={settings?.language || 'en'}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="en">English</option>
                                    <option value="vi">Vietnamese</option>
                                    <option value="ja">Japanese</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Music Settings</CardTitle>
                        <CardDescription>Configure default music player behavior.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="musicDefaultVolume">Default Volume (%)</Label>
                                <Input 
                                    id="musicDefaultVolume" 
                                    type="number"
                                    name="musicDefaultVolume" 
                                    value={settings?.musicDefaultVolume || 50} 
                                    onChange={handleChange} 
                                    min={1} max={100}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="musicIdleTimeout">Idle Timeout (Seconds)</Label>
                                <Input 
                                    id="musicIdleTimeout" 
                                    type="number"
                                    name="musicIdleTimeout" 
                                    value={settings?.musicIdleTimeout || 180} 
                                    onChange={handleChange} 
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Leveling System</CardTitle>
                        <CardDescription>Configure how users gain experience in your server.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Enable Leveling</Label>
                                <p className="text-sm text-muted-foreground">
                                    Allow users to gain XP and levels.
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    name="levelingEnabled"
                                    checked={settings?.levelingEnabled || false}
                                    onChange={handleChange}
                                    className="h-5 w-5 rounded border-input text-primary focus:ring-primary"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="levelUpChannelId">Level Up Channel ID</Label>
                            <Input 
                                id="levelUpChannelId" 
                                name="levelUpChannelId" 
                                value={settings?.levelUpChannelId || ''} 
                                onChange={handleChange} 
                                placeholder="e.g. 123456789012345678" 
                            />
                            <p className="text-xs text-muted-foreground">Leave empty to send message in the current channel.</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="xpRateMessage">XP per Message</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    id="xpRateMessage" 
                                    type="number" 
                                    name="xpRateMessage" 
                                    value={settings?.xpRateMessage || 0} 
                                    onChange={handleChange} 
                                    className="max-w-[150px]"
                                />
                                <span className="text-sm text-muted-foreground">XP</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end bg-muted/50 p-4">
                        <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {saving ? 'Save Changes' : 'Save Changes'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            </div>
        </div>
    );
}
