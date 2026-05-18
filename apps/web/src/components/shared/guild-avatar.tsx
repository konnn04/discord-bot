import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { DISCORD_CDN } from "@/lib/constants";

interface GuildAvatarProps {
  guildId: string;
  icon: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function GuildAvatar({
  guildId,
  icon,
  name,
  size = 128,
  className,
}: GuildAvatarProps) {
  const src = icon
    ? `${DISCORD_CDN}/icons/${guildId}/${icon}.png?size=${size}`
    : undefined;

  return (
    <Avatar className={className}>
      <AvatarImage src={src} />
      <AvatarFallback className={className}>
        {name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
