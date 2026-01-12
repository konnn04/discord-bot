import type { VoiceConnection, AudioPlayer } from '@discordjs/voice';
import type { TextChannel } from 'discord.js';

export interface Song {
    title: string;
    url: string;
    duration: number | string;
    durationFormatted?: string;
    artist: string;
    author?: string; 
    thumbnail: string | null;
    requester?: {
        id: string; 
        globalName?: string | null; 
        username: string; 
        displayAvatarURL: () => string;
    };
    source?: string;
    streamUrl?: string;
    images?: { url: string }[];
}

export interface MusicQueue {
    connection: VoiceConnection;
    player: AudioPlayer;
    songs: Song[];
    volume: number;
    playing: boolean;
    textChannel: TextChannel | null;
    disconnectTimeout: NodeJS.Timeout | null;
    loop: boolean;
    currentResource: any;
    history: Song[];
}
