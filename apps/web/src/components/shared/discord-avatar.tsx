import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { DISCORD_CDN } from "@/lib/constants";

interface DiscordAvatarProps {
  userId: string;
  avatar: string | null;
  displayName?: string;
  size?: number;
  className?: string;
}

/** Reusable Discord user avatar with CDN URL construction */
export function DiscordAvatar({
  userId,
  avatar,
  displayName,
  size = 64,
  className,
}: DiscordAvatarProps) {
  const src = avatar
    ? `${DISCORD_CDN}/avatars/${userId}/${avatar}.png?size=${size}`
    : undefined;

  return (
    <Avatar className={className}>
      <AvatarImage src={src} />
      <AvatarFallback className={className}>
        {displayName?.[0]?.toUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
