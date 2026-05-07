import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  type AudioPlayer,
  type VoiceConnection,
  type AudioResource,
} from '@discordjs/voice';
import type {
  VoiceBasedChannel,
  TextChannel,
  Client,
  Message,
} from 'discord.js';
import { EmbedBuilder, ButtonInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { getQueueManager } from './queue-manager';
import { getMusicApi } from './music-api.client';
import { createNowPlayingEmbed, createMusicButtons } from './now-playing-ui';
import { handleMusicButton } from './music-button.handler';

interface GuildPlayer {
  connection: VoiceConnection;
  player: AudioPlayer;
  resource: AudioResource | null;
  playStartedAt: number;
  autoLeaveTimeout: NodeJS.Timeout | null;
  nowPlayingMessage: Message | null;
  client: Client | null;
  stopping: boolean;
  switching: boolean;
}

let _prisma: any = null;
let _guildSettings: any = null;

function getPrisma(): any {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
}

export function setPlayerPrisma(prisma: any): void {
  _prisma = prisma;
}

export function setPlayerGuildSettings(settings: any): void {
  _guildSettings = settings;
}

function getAutoLeaveMs(guildId: string): number {
  if (_guildSettings) {
    return (_guildSettings.get(guildId)?.music?.autoLeaveTimeout ?? 120) * 1000;
  }
  return 120 * 1000;
}

async function recordHistory(
  discordId: string,
  guildId: string,
  track: {
    title: string;
    artist: string;
    url: string;
    source: string;
    sourceId: string;
    duration: number;
  },
): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;
  try {
    await prisma.musicHistory.create({
      data: {
        discordId,
        guildId,
        title: track.title || 'Unknown',
        artist: track.artist || 'Không rõ',
        url: track.url || '',
        source: track.source,
        sourceId: track.sourceId,
        duration: track.duration || 0,
      },
    });
  } catch (err) {
    console.error('[MusicHistory] Failed to record:', err);
  }
}

export class PlayerManager {
  private players = new Map<string, GuildPlayer>();

  join(channel: VoiceBasedChannel): GuildPlayer {
    const guildId = channel.guild.id;

    const existing = this.players.get(guildId);
    if (
      existing &&
      existing.connection.state.status !== VoiceConnectionStatus.Destroyed
    ) {
      return existing;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    const gp: GuildPlayer = {
      connection,
      player,
      resource: null,
      playStartedAt: 0,
      autoLeaveTimeout: null,
      nowPlayingMessage: null,
      client: null,
      stopping: false,
      switching: false,
    };

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.cleanup(guildId);
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.cleanup(guildId);
    });

    player.on(AudioPlayerStatus.Idle, () => {
      void this.onTrackEnd(guildId);
    });

    player.on(AudioPlayerStatus.Playing, () => {
      const gp = this.players.get(guildId);
      if (gp) gp.switching = false;
    });

    player.on('error', (error) => {
      console.error(
        `[PlayerManager] Audio error in guild ${guildId}:`,
        error.message,
      );
      // The player will transition to Idle after error — onTrackEnd handles recovery.
      // Do NOT skip manually here to avoid double-skipping.
    });

    this.players.set(guildId, gp);
    return gp;
  }

  async play(guildId: string, client?: Client): Promise<boolean> {
    const gp = this.players.get(guildId);
    if (!gp) return false;
    if (client) gp.client = client;

    // Set switching BEFORE any async work so onTrackEnd doesn't race.
    // Reset only after new track confirms Playing.
    gp.switching = true;

    // Force-stop current audio to prevent old-stream events from interfering
    // with the new stream during skip/switching.
    gp.player.stop(true);

    const qm = getQueueManager();
    const current = qm.getCurrent(guildId);
    if (!current) {
      gp.switching = false;
      return false;
    }

    const api = getMusicApi();

    try {
      // Resolve youtubeId in background for history/prefetch (non-blocking)
      if (!current.youtubeId) {
        if (current.track.source === 'youtube') {
          current.youtubeId = current.track.sourceId;
        } else if (current.track.source === 'spotify') {
          api
            .resolve(current.track.sourceId)
            .then((resolved) => {
              current.youtubeId = resolved.youtube.sourceId;
            })
            .catch((err) => {
              console.warn(
                `[PlayerManager] Background resolve failed for "${current.track.title}": ${String(err)}`,
              );
            });
        }
      }

      void this.prefetchNextTrack(guildId);

      // One-shot: server parses URL → resolves → streams in one call
      const response = await api.fetchPlayStream(current.track.url);

      if (!response.ok || !response.body) {
        throw new Error(`Stream fetch failed: ${response.status}`);
      }

      const { Readable } = await import('stream');
      const nodeStream = Readable.fromWeb(response.body as any);

      nodeStream.on('error', (err) => {
        console.error(
          `[PlayerManager] Stream read error in guild ${guildId}:`,
          err.message,
        );
        gp.player.stop(true);
      });

      let streamEnded = false;
      nodeStream.on('end', () => {
        streamEnded = true;
      });
      nodeStream.on('close', () => {
        if (!streamEnded) {
          console.warn(
            `[PlayerManager] Stream closed prematurely in guild ${guildId}`,
          );
          if (!gp.stopping && !gp.switching) {
            gp.player.stop(true);
          }
        }
      });

      const resource = createAudioResource(nodeStream, {
        inputType: StreamType.WebmOpus,
        inlineVolume: true,
      });

      const vol = qm.getVolume(guildId);
      resource.volume?.setVolume(vol / 100);

      gp.resource = resource;
      gp.playStartedAt = Date.now();
      gp.stopping = false;

      gp.player.play(resource);

      if (gp.autoLeaveTimeout) {
        clearTimeout(gp.autoLeaveTimeout);
        gp.autoLeaveTimeout = null;
      }

      void recordHistory(current.requestedById, guildId, current.track);

      await this.sendNowPlaying(guildId);

      return true;
    } catch (error) {
      gp.switching = false;
      console.error(
        `[PlayerManager] Failed to play in guild ${guildId}:`,
        error,
      );
      return false;
    }
  }

  private async sendNowPlaying(guildId: string): Promise<void> {
    const gp = this.players.get(guildId);
    if (!gp?.client) return;

    const qm = getQueueManager();
    const queue = qm.get(guildId);
    if (!queue) return;

    const embed = createNowPlayingEmbed(guildId, false, 0);
    if (!embed) return;

    const buttons = createMusicButtons(false);

    if (gp.nowPlayingMessage) {
      const shouldRecreate = await this._isNotLastMessage(gp);
      if (!shouldRecreate) {
        try {
          await gp.nowPlayingMessage.edit({
            embeds: [embed],
            components: [buttons],
          });
          return;
        } catch {
          // Edit failed — fall through to send new
        }
      }
      await this.deleteNowPlaying(guildId);
    }

    try {
      const ch = await gp.client.channels.fetch(queue.textChannelId);
      if (ch && ch.isTextBased()) {
        const textCh = ch as TextChannel;
        const msg = await textCh.send({
          embeds: [embed],
          components: [buttons],
        });
        gp.nowPlayingMessage = msg;
      }
    } catch {
      // Ignore send errors
    }
  }

  private async _isNotLastMessage(gp: GuildPlayer): Promise<boolean> {
    if (!gp.nowPlayingMessage || !gp.client) return true;
    try {
      const ch = await gp.client.channels.fetch(gp.nowPlayingMessage.channelId);
      if (!ch || !('lastMessageId' in ch)) return true;
      return (ch as TextChannel).lastMessageId !== gp.nowPlayingMessage.id;
    } catch {
      return true;
    }
  }

  async deleteNowPlayingPublic(guildId: string): Promise<void> {
    await this.deleteNowPlaying(guildId);
  }

  /** Expose GuildPlayer for external handlers (e.g. music button handler) */
  getGuildPlayer(guildId: string): GuildPlayer | undefined {
    return this.players.get(guildId);
  }

  private async deleteNowPlaying(guildId: string): Promise<void> {
    const gp = this.players.get(guildId);
    if (!gp?.nowPlayingMessage) return;

    try {
      await gp.nowPlayingMessage.delete();
      gp.nowPlayingMessage = null;
    } catch {
      gp.nowPlayingMessage = null;
    }
  }

  async handleButton(interaction: ButtonInteraction): Promise<void> {
    return handleMusicButton(this, interaction);
  }

  private async onTrackEnd(guildId: string): Promise<void> {
    const gp = this.players.get(guildId);

    if (gp?.stopping) return;

    if (gp?.switching) return;

    const qm = getQueueManager();

    if (qm.hasNext(guildId)) {
      qm.skip(guildId, 1, true);
      const result = await this.playWithAutoSkip(
        guildId,
        gp?.client || undefined,
      );
      if (!result.success) {
        // All remaining tracks are broken — stop and notify
        await this.deleteNowPlaying(guildId);

        if (gp?.client) {
          const queue = getQueueManager().get(guildId);
          if (queue) {
            try {
              const ch = await gp.client.channels.fetch(queue.textChannelId);
              if (ch && ch.isTextBased()) {
                const msg =
                  result.autoSkippedCount > 0
                    ? `⚠️ Đã tự động bỏ qua ${result.autoSkippedCount} bài bị lỗi. Hết queue rồi!`
                    : '⚠️ Không thể phát bài tiếp theo. Hết queue rồi!';
                await (ch as TextChannel).send({
                  embeds: [
                    new EmbedBuilder().setColor(0xf59e0b).setDescription(msg),
                  ],
                });
              }
            } catch {
              // Ignore send errors
            }
          }
        }

        if (gp) {
          gp.autoLeaveTimeout = setTimeout(() => {
            void this.leaveWithNotice(guildId);
          }, getAutoLeaveMs(guildId));
        }
      }
    } else {
      await this.deleteNowPlaying(guildId);

      if (gp?.client) {
        const queue = getQueueManager().get(guildId);
        if (queue) {
          try {
            const ch = await gp.client.channels.fetch(queue.textChannelId);
            if (ch && ch.isTextBased()) {
              await (ch as TextChannel).send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x7c3aed)
                    .setDescription(
                      '📋 Đã phát hết queue. Dùng `/play` để thêm bài mới!',
                    ),
                ],
              });
            }
          } catch {
            // Ignore send errors
          }
        }
      }

      if (gp) {
        gp.autoLeaveTimeout = setTimeout(() => {
          void this.leaveWithNotice(guildId);
        }, getAutoLeaveMs(guildId));
      }
    }
  }

  pause(guildId: string): boolean {
    const gp = this.players.get(guildId);
    if (!gp) return false;
    if (gp.player.state.status === AudioPlayerStatus.Playing) {
      gp.player.pause();
      return true;
    }
    return false;
  }

  resume(guildId: string): boolean {
    const gp = this.players.get(guildId);
    if (!gp) return false;
    if (gp.player.state.status === AudioPlayerStatus.Paused) {
      gp.player.unpause();
      return true;
    }
    return false;
  }

  isPaused(guildId: string): boolean {
    const gp = this.players.get(guildId);
    return gp?.player.state.status === AudioPlayerStatus.Paused;
  }

  isPlaying(guildId: string): boolean {
    const gp = this.players.get(guildId);
    if (!gp) return false;
    return (
      gp.player.state.status === AudioPlayerStatus.Playing ||
      gp.player.state.status === AudioPlayerStatus.Paused
    );
  }

  stop(guildId: string): void {
    const gp = this.players.get(guildId);
    if (gp) {
      gp.stopping = true;
      gp.switching = false;
      gp.player.stop(true);

      if (!gp.autoLeaveTimeout) {
        gp.autoLeaveTimeout = setTimeout(() => {
          void this.leaveWithNotice(guildId);
        }, getAutoLeaveMs(guildId));
      }
    }
    getQueueManager().clear(guildId);
  }

  leave(guildId: string): void {
    void this.deleteNowPlaying(guildId);
    const gp = this.players.get(guildId);
    if (gp) {
      if (gp.autoLeaveTimeout) clearTimeout(gp.autoLeaveTimeout);
      gp.stopping = true;
      gp.player.stop(true);
      gp.connection.destroy();
    }
    this.players.delete(guildId);
    getQueueManager().remove(guildId);
  }

  private async leaveWithNotice(guildId: string): Promise<void> {
    const gp = this.players.get(guildId);
    const queue = getQueueManager().get(guildId);

    if (gp?.client && queue) {
      try {
        const ch = await gp.client.channels.fetch(queue.textChannelId);
        if (ch && ch.isTextBased()) {
          await (ch as TextChannel).send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x6b7280)
                .setDescription('👋 Đã rời kênh thoại do không có hoạt động.'),
            ],
          });
        }
      } catch {
        // Ignore send errors
      }
    }

    this.leave(guildId);
  }

  setVolume(guildId: string, vol: number): void {
    const qm = getQueueManager();
    qm.setVolume(guildId, vol);
    const gp = this.players.get(guildId);
    if (gp?.resource?.volume) {
      gp.resource.volume.setVolume(vol / 100);
    }
  }

  getElapsed(guildId: string): number {
    const gp = this.players.get(guildId);
    if (!gp || !gp.playStartedAt) return 0;
    return Math.floor((Date.now() - gp.playStartedAt) / 1000);
  }

  private cleanup(guildId: string): void {
    void this.deleteNowPlaying(guildId);
    const gp = this.players.get(guildId);
    if (gp) {
      if (gp.autoLeaveTimeout) clearTimeout(gp.autoLeaveTimeout);
      gp.player.stop(true);
    }
    this.players.delete(guildId);
    getQueueManager().remove(guildId);
  }

  isConnected(guildId: string): boolean {
    const gp = this.players.get(guildId);
    return (
      !!gp && gp.connection.state.status !== VoiceConnectionStatus.Destroyed
    );
  }

  handleAloneInChannel(guildId: string): void {
    const gp = this.players.get(guildId);
    if (!gp || gp.autoLeaveTimeout) return;
    gp.player.pause();
    gp.autoLeaveTimeout = setTimeout(() => {
      void this.leaveWithNotice(guildId);
    }, getAutoLeaveMs(guildId));
  }

  cancelAutoLeave(guildId: string): void {
    const gp = this.players.get(guildId);
    if (gp?.autoLeaveTimeout) {
      clearTimeout(gp.autoLeaveTimeout);
      gp.autoLeaveTimeout = null;
      if (gp.player.state.status === AudioPlayerStatus.Paused) {
        gp.player.unpause();
      }
    }
  }

  /**
   * Try to play the current track. If it fails, auto-skip and retry
   * up to maxRetries times. Returns the number of tracks auto-skipped,
   * or -1 if all tracks are exhausted.
   */
  async playWithAutoSkip(
    guildId: string,
    client?: Client,
    maxRetries = 20,
  ): Promise<{
    success: boolean;
    autoSkippedCount: number;
    lastError?: string;
  }> {
    // Guard: if another play is already starting (switching=true set synchronously
    // in play()), don't interfere — let the in-flight call handle playback.
    const gp = this.players.get(guildId);
    if (gp?.switching) {
      return { success: true, autoSkippedCount: 0 };
    }

    const qm = getQueueManager();
    let autoSkippedCount = 0;
    let lastError: string | undefined;

    while (autoSkippedCount <= maxRetries) {
      const current = qm.getCurrent(guildId);
      if (!current) {
        // No more tracks — don't stop, let the caller decide
        return { success: false, autoSkippedCount, lastError };
      }

      const ok = await this.play(guildId, client);
      if (ok) {
        return { success: true, autoSkippedCount };
      }

      // Play failed — log and skip to next
      lastError = `Không thể phát: **${current.track.title}**`;
      console.warn(
        `[PlayerManager] Auto-skipping broken track in guild ${guildId}: ${current.track.title}`,
      );

      const next = qm.skip(guildId, 1);
      autoSkippedCount++;

      if (!next) {
        // Queue exhausted after auto-skip — don't stop, let the caller decide
        return { success: false, autoSkippedCount, lastError };
      }
    }

    // Exceeded max retries — don't stop, let the caller decide
    return { success: false, autoSkippedCount, lastError };
  }

  private prefetchNextTrack(guildId: string): void {
    const qm = getQueueManager();
    const queue = qm.get(guildId);
    if (!queue || queue.tracks.length === 0) return;

    const nextIndex = queue.current + 1;
    if (nextIndex >= queue.tracks.length) {
      if (queue.loopMode === 'queue') {
        const firstTrack = queue.tracks[0];
        if (firstTrack && !firstTrack.youtubeId) {
          this.resolveTrack(firstTrack).catch(() => {});
        }
      }
      return;
    }

    const nextTrack = queue.tracks[nextIndex];
    if (nextTrack && !nextTrack.youtubeId) {
      this.resolveTrack(nextTrack).catch(() => {});
    }
  }

  private async resolveTrack(item: any): Promise<void> {
    if (item.youtubeId) return;

    if (item.track.source === 'youtube') {
      item.youtubeId = item.track.sourceId;
      return;
    }

    try {
      const api = getMusicApi();
      const resolved = await api.resolve(item.track.sourceId);
      item.youtubeId = resolved.youtube.sourceId;
    } catch (err) {
      console.warn(
        `[PlayerManager] Prefetch resolve failed for "${item.track.title}" (${item.track.sourceId}): ${String(err)}`,
      );
    }
  }
}

let _instance: PlayerManager | null = null;
export function getPlayerManager(): PlayerManager {
  if (!_instance) _instance = new PlayerManager();
  return _instance;
}
