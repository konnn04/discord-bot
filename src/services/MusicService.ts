import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus, 
  entersState, 
  AudioPlayer, 
  VoiceConnection,
  NoSubscriberBehavior
} from '@discordjs/voice';
import { Readable } from 'stream';
import RiknClient from 'rikn-music-fetcher';
import { Guild, VoiceBasedChannel, TextChannel, EmbedBuilder } from 'discord.js';
import { db } from '../database/client';
import { musicQueue } from '../database/schema/musicQueue';
import { guildSettings } from '../database/schema/guildSettings';
import { eq } from 'drizzle-orm';
import { config } from '@config/env';
import { formatDuration } from '@src/utils/formatUtils';
import { SocketService } from './SocketService';
import { I18nService } from './I18nService';

interface MusicQueue {
  connection: VoiceConnection;
  player: AudioPlayer;
  songs: any[];
  volume: number;
  playing: boolean;
  textChannel: TextChannel | null;
  disconnectTimeout: NodeJS.Timeout | null;
  loop: boolean;
  currentResource: any;
  history: any[];
}

export class MusicService {
  private static queues: Map<string, MusicQueue> = new Map();
  private static client = new RiknClient({
      ytdlp: {
          autoUpdate: true,
          binDir: config.youtube.binDir,
          cookiesPath: config.youtube.cookiesPath,
          userAgent: config.youtube.userAgent,
          updateIntervalDays: 3,
      },
      spotify: {
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret,
      },
      ytmusic: {
        GL: config.youtubeMusic.gl,
        HL: config.youtubeMusic.hl,
        cookiesPath: config.youtubeMusic.cookiesPath,
      }
  });

  static getQueue(guildId: string) {
    return this.queues.get(guildId);
  }

  // --- Socket Helpers ---
  private static emitUpdate(guildId: string, event: string, payload: any = {}) {
      const queue = this.queues.get(guildId);
      const state = queue ? {
          playing: queue.playing,
          currentSong: queue.songs[0] || null,
          queue: queue.songs,
          volume: queue.volume,
          loop: queue.loop
      } : null;

      SocketService.emitToGuild(guildId, event, { ...payload, state });
  }

  private static emitState(guildId: string) {
       this.emitUpdate(guildId, 'music:state_update');
  }

  // --- DB Persistence ---
  private static async saveQueueToDB(guildId: string) {
      const queue = this.queues.get(guildId);
      if (!queue) return;

      const queueState = {
          songs: queue.songs.slice(0, 50),
          loop: queue.loop,
          volume: queue.volume,
          currentIndex: 0,
      };

      try {
          const existing = await db.select().from(musicQueue).where(eq(musicQueue.guildId, guildId)).limit(1);

          if (existing.length > 0) {
              await db.update(musicQueue).set({
                  queueData: queueState,
                  isLooping: queue.loop,
                  volume: queue.volume,
                  updatedAt: new Date(),
              }).where(eq(musicQueue.guildId, guildId));
          } else {
              await db.insert(musicQueue).values({
                  guildId,
                  queueData: queueState,
                  isLooping: queue.loop,
                  volume: queue.volume,
              });
          }
      } catch (e) {
          console.error('[Music] Failed to save queue db:', e);
      }
  }

  // --- Core Methods ---

  static async join(guild: Guild, voiceChannel: VoiceBasedChannel, textChannel: TextChannel) {
      // Force destroy existing if state is bad
      let queue = this.queues.get(guild.id);
      if (queue && (queue.connection.state.status === VoiceConnectionStatus.Disconnected || queue.connection.state.status === VoiceConnectionStatus.Destroyed)) {
          this.destroyQueue(guild.id);
          queue = undefined;
      }

      if (!queue) {
           const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
           });

           const player = createAudioPlayer({
                behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
           });

           queue = {
                connection,
                player,
                songs: [],
                volume: 100,
                playing: false,
                textChannel,
                disconnectTimeout: null,
                loop: false,
                currentResource: null,
                history: []
           };

           this.queues.set(guild.id, queue);
           connection.subscribe(player);

           player.on(AudioPlayerStatus.Idle, () => this.handleIdle(guild.id));
           player.on('error', error => {
                console.error(`[Music] Player Error: ${error.message}`);
                this.handleIdle(guild.id);
           });

           connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (error) {
                    this.destroyQueue(guild.id);
                }
           });

           this.emitState(guild.id);
      }
      return queue;
  }

  static async play(guild: Guild, voiceChannel: VoiceBasedChannel, textChannel: TextChannel, query: string, requester: any) {
    const me = guild.members.me;
    const currentVoiceId = me?.voice.channelId;

    let queue = this.queues.get(guild.id);

    if (queue && !currentVoiceId) {
        this.destroyQueue(guild.id);
        queue = await this.join(guild, voiceChannel, textChannel);
    } else if (!queue) {
        queue = await this.join(guild, voiceChannel, textChannel);
    }

    if (queue) queue.textChannel = textChannel;

    if (queue && queue.disconnectTimeout) {
        clearTimeout(queue.disconnectTimeout);
        queue.disconnectTimeout = null;
    }

    try {
        let songsToAdd: any[] = [];
        const isUrl = query.startsWith('http');

        if (isUrl) {
             if (query.includes('list=') || query.includes('/playlist/')) {
                 songsToAdd = await this.client.getSongsByPlaylist(query);
             } else {
                 const song = await this.client.getSongByUrl(query);
                 if (song) songsToAdd.push(song);
             }
        } else {
             const song = await this.client.searchFirstAndStream(query);
             if (song) songsToAdd.push(song);
        }

        if (songsToAdd.length === 0) {
            textChannel.send(await I18nService.t(guild.id, 'music.emptyQueue'));
            if (queue?.songs.length === 0 && queue.player.state.status === AudioPlayerStatus.Idle) {
                 this.startIdleTimer(guild.id);
            }
            return;
        }

        songsToAdd.forEach(s => s.requester = requester);

        if (queue) {
            queue.songs.push(...songsToAdd);
            this.saveQueueToDB(guild.id);
            this.emitUpdate(guild.id, 'music:queue_add', { added: songsToAdd.length });

            // Build Embed for Added Songs
            const embed = new EmbedBuilder().setColor('#00ff00');
            const requesterName = requester.globalName || requester.username;

            if (songsToAdd.length > 1) {
                embed.setTitle(await I18nService.t(guild.id, 'music.songAdded')); // Use generic added title or specific playlist key
                const desc = await I18nService.t(guild.id, 'music.addedToQueue', { count: songsToAdd.length });
                embed.setDescription(desc);
                if (songsToAdd[0].thumbnail) embed.setThumbnail(songsToAdd[0].thumbnail);
                const footerText = await I18nService.t(guild.id, 'music.footer', { user: requesterName });
                embed.setFooter({ text: footerText, iconURL: requester.displayAvatarURL() });
            } else {
                const song = songsToAdd[0];
                embed.setTitle(await I18nService.t(guild.id, 'music.songAdded'));
                embed.setDescription(`[${song.title}](${song.url})\n**Artist:** ${song.artist}`);
                if (song.thumbnail) embed.setThumbnail(song.thumbnail);
                embed.addFields([
                    { name: 'Duration', value: formatDuration(song.duration), inline: true },
                    { name: 'Position in Queue', value: String(queue.songs.length), inline: true },
                    { name: 'Platform', value: song.source ? song.source.charAt(0).toUpperCase() + song.source.slice(1) : 'Unknown', inline: true }
                ]);
                const footerText = await I18nService.t(guild.id, 'music.footer', { user: requesterName });
                embed.setFooter({ text: footerText, iconURL: requester.displayAvatarURL() });
            }

            textChannel.send({ embeds: [embed] });

            // Ensure playback starts if idle
            if (queue.player.state.status === AudioPlayerStatus.Idle) {
                this.playNext(guild.id);
            }
        }

    } catch (err) {
        console.error('[Music] Fetch Error:', err);
        textChannel.send(await I18nService.t(guild.id, 'music.fetchError'));
    }
  }

  private static async playNext(guildId: string) {
      const queue = this.queues.get(guildId);
      if (!queue) return;

      const song = queue.songs[0];
      if (!song) {
          queue.playing = false;
          this.emitState(guildId);
          this.startIdleTimer(guildId);
          return;
      }

      try {
          // Get Stream if not present
          let stream;
          if (song.streamUrl) {
               stream = await this.client.streamSongByUrl(song.url || song.streamUrl);
          } else {
               // Fallback search/stream
               stream = await this.client.streamSongByUrl(song.url);
          }

          // Convert Web Stream to Node Readable
          const nodeStream = Readable.from(stream as any);
          const resource = createAudioResource(nodeStream, { inlineVolume: true });
          resource.volume?.setVolumeLogarithmic(queue.volume / 100);

          queue.currentResource = resource;
          queue.player.play(resource);
          queue.playing = true;

          // Now Playing Embed
          const embed = new EmbedBuilder()
            .setTitle(await I18nService.t(guildId, 'music.playing'))
            .setDescription(`[${song.title}](${song.url})\n**Artist:** ${song.artist}`)
            .setColor('#3498db')
            .setThumbnail(song.thumbnail || null)
            .addFields([
                { name: 'Duration', value: formatDuration(song.duration), inline: true },
                { name: 'Requested By', value: song.requester ? `<@${song.requester.id}>` : 'Unknown', inline: true },
                { name: 'Platform', value: song.source ? song.source.charAt(0).toUpperCase() + song.source.slice(1) : 'Unknown', inline: true }
            ]);

          queue.textChannel?.send({ embeds: [embed] });

          this.saveQueueToDB(guildId);
          this.emitUpdate(guildId, 'music:track_start', { song });

      } catch (err) {
          console.error('[Music] Play Error:', err);
          const msg = await I18nService.t(guildId, 'music.playError', { song: song.title });
          queue.textChannel?.send(msg);
          // Shift failed song and try next
          queue.songs.shift();
          this.playNext(guildId);
      }
  }

  private static handleIdle(guildId: string) {
      const queue = this.queues.get(guildId);
      if (!queue) return;

      // Handle loop or history
      // Note: We shift AFTER the song is finished playing
      const finished = queue.songs.shift();
      if (finished) {
          if (queue.loop) {
              queue.songs.push(finished);
          } else {
              queue.history.push(finished);
              if (queue.history.length > 20) queue.history.shift();
          }
      }

      this.playNext(guildId);
  }

  // --- Control Methods ---

  static stop(guildId: string): boolean {
      const queue = this.queues.get(guildId);
      if (queue) {
          queue.songs = [];
          queue.player.stop();
          this.saveQueueToDB(guildId);
          this.emitState(guildId);
          return true;
      }
      return false;
  }

  static skip(guildId: string): boolean {
      const queue = this.queues.get(guildId);
      if (queue) {
          queue.player.stop();
          return true;
      }
      return false;
  }

  static pause(guildId: string): boolean {
       const queue = this.queues.get(guildId);
       if (queue && queue.playing) {
           queue.player.pause();
           queue.playing = false;
           this.emitState(guildId);
           return true;
       }
       return false;
  }

  static resume(guildId: string): boolean {
       const queue = this.queues.get(guildId);
       if (queue && !queue.playing) {
           queue.player.unpause();
           queue.playing = true;
           this.emitState(guildId);
           return true;
       }
       return false;
  }

  static toggleLoop(guildId: string): boolean | null {
      const queue = this.queues.get(guildId);
      if (queue) {
          queue.loop = !queue.loop;
          this.saveQueueToDB(guildId);
          this.emitState(guildId);
          return queue.loop;
      }
      return null;
  }

  static shuffle(guildId: string): boolean {
      const queue = this.queues.get(guildId);
      if (queue && queue.songs.length > 1) {
          const current = queue.songs[0];
          const rest = queue.songs.slice(1);

          for (let i = rest.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [rest[i], rest[j]] = [rest[j], rest[i]];
          }

          queue.songs = [current, ...rest];
          this.saveQueueToDB(guildId);
          this.emitState(guildId);
          return true;
      }
      return false;
  }

  static setVolume(guildId: string, level: number): boolean {
      const queue = this.queues.get(guildId);
      if (queue) {
          queue.volume = level;
          if (queue.currentResource && queue.currentResource.volume) {
              queue.currentResource.volume.setVolumeLogarithmic(level / 100);
          }
          this.saveQueueToDB(guildId);
          this.emitState(guildId);
          return true;
      }
      return false;
  }

  static removeSong(guildId: string, index: number): string | null {
      const queue = this.queues.get(guildId);
      if (queue && index > 1 && index <= queue.songs.length) {
          const removed = queue.songs.splice(index - 1, 1)[0];
          this.saveQueueToDB(guildId);
          this.emitState(guildId);
          return removed.title;
      }
      return null;
  }

  static previous(guildId: string): string | null {
      const queue = this.queues.get(guildId);
      if (queue && queue.history.length > 0) {
          const prev = queue.history.pop();
          if (prev) {
             queue.songs.splice(1, 0, prev);
             queue.player.stop();
             this.emitState(guildId);
             return prev.title;
          }
      }
      return null;
  }

  static async search(query: string) {
      try {
          return await this.client.searchSong(query);
      } catch (e) {
          console.error(e);
          return [];
      }
  }

  static async getLyrics(guildId: string, songTitle?: string) {
      const queue = this.queues.get(guildId);
      let query = songTitle;
      let artist = '';

      if (!query && queue && queue.songs[0]) {
          query = queue.songs[0].title;
          artist = queue.songs[0].artist;
      }

      if (!query) return null;

      try {
          if (artist) {
               return await this.client.getLyrics(query, artist);
          }
          const results = await this.client.searchLyrics(query, '');
          if (results && results.length > 0) return results[0];

          return null;
      } catch (e) {
          console.error('[Music] Lyrics error:', e);
          return null;
      }
  }

  // --- Internals ---
  
  public static cancelIdleTimer(guildId: string) {
      const queue = this.queues.get(guildId);
      if (queue && queue.disconnectTimeout) {
          clearTimeout(queue.disconnectTimeout);
          queue.disconnectTimeout = null;
      }
  }

  public static async startIdleTimer(guildId: string) {
      const queue = this.queues.get(guildId);
      if (!queue) return;

      let timeoutMs = 3 * 60 * 1000; // Default 3 mins

      try {
          const settings = await db.select().from(guildSettings).where(eq(guildSettings.guildId, guildId)).limit(1);
          if (settings.length > 0 && settings[0].musicIdleTimeout) {
              timeoutMs = settings[0].musicIdleTimeout * 1000;
          }
      } catch (e) {
          // ignore DB error, use default
      }

      if (queue.disconnectTimeout) clearTimeout(queue.disconnectTimeout);

      queue.disconnectTimeout = setTimeout(async () => {
          const msg = await I18nService.t(guildId, 'music.idleDisconnect');
          queue.textChannel?.send({ embeds: [new EmbedBuilder().setColor('Red').setDescription(msg)] });
          this.destroyQueue(guildId);
      }, timeoutMs);
  }

  static destroyQueue(guildId: string) {
      const queue = this.queues.get(guildId);
      if (queue) {
          if (queue.disconnectTimeout) clearTimeout(queue.disconnectTimeout);
          queue.connection.destroy();
          this.queues.delete(guildId);
          this.emitState(guildId);
      }
  }
}
