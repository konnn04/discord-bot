import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
  entersState,
  VoiceConnectionStatus,
  type AudioPlayer,
  type VoiceConnection,
} from '@discordjs/voice';
import type { Guild, VoiceBasedChannel } from 'discord.js';
import { Readable } from 'node:stream';
import { EdgeTTS } from 'edge-tts-universal';

export type SpeakLanguage = 'vi' | 'en';

const VOICE_BY_LANG: Record<SpeakLanguage, string> = {
  vi: 'vi-VN-NamMinhNeural',
  en: 'en-US-AriaNeural',
};

/** Language-specific words used when reading chat aloud. */
const WORDS: Record<SpeakLanguage, { link: string; said: string }> = {
  vi: { link: 'đường dẫn', said: 'nói' },
  en: { link: 'a link', said: 'said' },
};

export interface SpeakAuthor {
  id: string;
  displayName: string;
}

interface SpeakSession {
  guildId: string;
  guild: Guild;
  voiceChannelId: string;
  textChannelId: string;
  language: SpeakLanguage;
  connection: VoiceConnection;
  player: AudioPlayer;
  queue: string[];
  speaking: boolean;
  /** Last user whose message was read — used to prefix "X said:" on speaker change. */
  lastSpeakerId: string | null;
}

export class SpeakManager {
  private sessions = new Map<string, SpeakSession>();

  isActive(guildId: string): boolean {
    return this.sessions.has(guildId);
  }

  getSession(guildId: string): SpeakSession | undefined {
    return this.sessions.get(guildId);
  }

  async start(
    voiceChannel: VoiceBasedChannel,
    textChannelId: string,
    language: SpeakLanguage,
  ): Promise<void> {
    if (this.sessions.has(voiceChannel.guild.id)) {
      throw new Error('Đã có phiên đọc chat đang chạy trong server này.');
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    } catch (err) {
      connection.destroy();
      throw err;
    }

    const player = createAudioPlayer();
    connection.subscribe(player);

    const session: SpeakSession = {
      guildId: voiceChannel.guild.id,
      guild: voiceChannel.guild,
      voiceChannelId: voiceChannel.id,
      textChannelId,
      language,
      connection,
      player,
      queue: [],
      speaking: false,
      lastSpeakerId: null,
    };

    player.on(AudioPlayerStatus.Idle, () => {
      session.speaking = false;
      void this.drain(session);
    });
    player.on('error', () => {
      session.speaking = false;
      void this.drain(session);
    });

    this.sessions.set(session.guildId, session);
  }

  stop(guildId: string): boolean {
    const session = this.sessions.get(guildId);
    if (!session) return false;
    this.sessions.delete(guildId);
    try {
      session.player.stop(true);
      session.connection.destroy();
    } catch {
      // already torn down
    }
    return true;
  }

  /** Queue a chat message to be read aloud (only if it belongs to the session). */
  enqueue(
    guildId: string,
    textChannelId: string,
    rawText: string,
    author: SpeakAuthor,
  ): void {
    const session = this.sessions.get(guildId);
    if (!session || session.textChannelId !== textChannelId) return;

    const body = sanitize(rawText, session.language, session.guild);
    if (!body) return;

    let text = body;
    if (session.lastSpeakerId !== author.id) {
      text = `${author.displayName} ${WORDS[session.language].said}: ${body}`;
    }
    session.lastSpeakerId = author.id;

    session.queue.push(text);
    if (session.queue.length > 20) session.queue.shift(); // drop backlog
    void this.drain(session);
  }

  private async drain(session: SpeakSession): Promise<void> {
    if (session.speaking) return;
    const next = session.queue.shift();
    if (!next) return;

    session.speaking = true;
    try {
      const tts = new EdgeTTS(next, VOICE_BY_LANG[session.language]);
      const { audio } = await tts.synthesize();
      const buffer = Buffer.from(await audio.arrayBuffer());
      const resource = createAudioResource(Readable.from(buffer), {
        inputType: StreamType.Arbitrary,
      });
      session.player.play(resource);
    } catch {
      session.speaking = false;
      void this.drain(session);
    }
  }
}

/**
 * Turn raw Discord message content into natural spoken text: resolve mentions to
 * names, custom emojis to their name, channels/roles to names, and URLs to a
 * short word — all language-aware. Caps length to keep utterances short.
 */
function sanitize(text: string, language: SpeakLanguage, guild: Guild): string {
  const words = WORDS[language];
  const cleaned = text
    // Custom emoji <:name:id> / <a:name:id> → the emoji's name
    .replace(/<a?:(\w+):\d+>/g, '$1')
    // User mention → member display name (fallback username)
    .replace(/<@!?(\d+)>/g, (_m, id: string) => {
      const member = guild.members.cache.get(id);
      const username = guild.client.users.cache.get(id)?.username;
      const fallback = language === 'en' ? 'someone' : 'ai đó';
      return member?.displayName ?? username ?? fallback;
    })
    // Role mention → role name
    .replace(/<@&(\d+)>/g, (_m, id: string) => {
      return (
        guild.roles.cache.get(id)?.name ??
        (language === 'en' ? 'a role' : 'một vai trò')
      );
    })
    // Channel mention → channel name
    .replace(/<#(\d+)>/g, (_m, id: string) => {
      const ch = guild.channels.cache.get(id);
      return ch?.name ?? (language === 'en' ? 'a channel' : 'một kênh');
    })
    // URLs → a short word
    .replace(/https?:\/\/\S+/g, words.link)
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 400);
}

let _instance: SpeakManager | null = null;
export function getSpeakManager(): SpeakManager {
  if (!_instance) _instance = new SpeakManager();
  return _instance;
}
