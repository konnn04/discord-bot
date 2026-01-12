import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface UserProfile {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
    discriminator: string;
}

const Profile = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.fetch<UserProfile>("/auth/me")
            .then(setUser)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return <div>Failed to load profile.</div>;

    const avatarUrl = user.avatar 
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256` 
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                    <AvatarImage src={avatarUrl} alt={user.username} />
                    <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-3xl font-bold">{user.globalName || user.username}</h1>
                    <p className="text-muted-foreground flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 inline-block"></span>
                        Online
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">ID: {user.id}</p>
                </div>
            </div>

            <Separator />
            
            <div className="text-center text-muted-foreground py-10">
                Stats coming soon...
            </div>
        </div>
    );
};

export default Profile;
