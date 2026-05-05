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
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  MessageFlags,
} from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { getQueueManager } from './queue-manager';
import { getMusicApi } from './music-api.client';
import { formatDuration } from './utils';

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

function createMusicButtons(
  isPaused: boolean,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_prev')
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_pause')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('music_lyrics')
      .setEmoji('🎤')
      .setStyle(ButtonStyle.Primary),
  );
}

function createNowPlayingEmbed(
  guildId: string,
  isPaused: boolean,
  elapsed?: number,
): EmbedBuilder | null {
  const qm = getQueueManager();
  const current = qm.getCurrent(guildId);
  if (!current) return null;

  const total = current.track.duration;
  const e = elapsed ?? 0;
  const vol = qm.getVolume(guildId);
  const remaining = qm.remaining(guildId);
  const statusIcon = isPaused ? '⏸️' : '▶️';

  let timeString = '';
  if (isPaused) {
    timeString = `⏳ Đã dừng ở **${formatDuration(e)}** / ${formatDuration(total)}`;
  } else {
    const endTimestamp = Math.floor((Date.now() + (total - e) * 1000) / 1000);
    timeString = `⏳ Kết thúc <t:${endTimestamp}:R>`;
  }

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setAuthor({ name: `${statusIcon} ${isPaused ? 'Tạm dừng' : 'Đang phát'}` })
    .setTitle(current.track.title)
    .setURL(current.track.url)
    .setDescription(
      `**${current.track.artist || 'Không rõ'}**${current.track.album ? ` • ${current.track.album}` : ''}\n\n` +
        `${timeString}\n\n` +
        `🔊 ${vol}% • 📋 Còn ${remaining} bài trong queue`,
    )
    .setThumbnail(current.track.thumbnail)
    .setFooter({ text: `Yêu cầu bởi ${current.requestedBy}` })
    .setTimestamp();

  const q = qm.get(guildId);
  if (q && q.current + 1 < q.tracks.length) {
    const next = q.tracks[q.current + 1];
    embed.addFields({
      name: '📋 Tiếp theo',
      value: `${next.track.title} — ${next.track.artist || 'Không rõ'} (${formatDuration(next.track.duration)})`,
    });
  }

  return embed;
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

class PlayerManager {
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

    player.on('error', (error) => {
      console.error(
        `[PlayerManager] Audio error in guild ${guildId}:`,
        error.message,
      );
    });

    this.players.set(guildId, gp);
    return gp;
  }

  async play(guildId: string, client?: Client): Promise<boolean> {
    const gp = this.players.get(guildId);
    if (!gp) return false;
    if (client) gp.client = client;

    const qm = getQueueManager();
    const current = qm.getCurrent(guildId);
    if (!current) return false;

    const api = getMusicApi();

    try {
      if (!current.youtubeId) {
        if (current.track.source === 'youtube') {
          current.youtubeId = current.track.sourceId;
        } else if (current.track.source === 'spotify') {
          try {
            const resolved = await api.resolve(current.track.sourceId);
            current.youtubeId = resolved.youtube.sourceId;
          } catch (error) {
            console.error(
              `Failed to resolve Spotify track ${current.track.title}:`,
              error,
            );
            throw new Error('Không thể tìm thấy bài hát này trên YouTube.');
          }
        }
      }

      if (!current.youtubeId) {
        throw new Error('Thiếu YouTube ID để phát nhạc.');
      }

      const streamUrl = api.getProxyStreamUrl(current.youtubeId);

      void this.prefetchNextTrack(guildId);

      const response = await fetch(streamUrl, {
        headers: api.getStreamHeaders(),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream fetch failed: ${response.status}`);
      }

      const { Readable } = await import('stream');
      const nodeStream = Readable.fromWeb(response.body as any);

      const resource = createAudioResource(nodeStream, {
        inputType: StreamType.WebmOpus,
        inlineVolume: true,
      });

      const vol = qm.getVolume(guildId);
      resource.volume?.setVolume(vol / 100);

      gp.resource = resource;
      gp.playStartedAt = Date.now();
      gp.stopping = false;

      gp.switching = true;
      gp.player.play(resource);
      gp.switching = false;

      if (gp.autoLeaveTimeout) {
        clearTimeout(gp.autoLeaveTimeout);
        gp.autoLeaveTimeout = null;
      }

      void recordHistory(current.requestedById, guildId, current.track);

      await this.sendNowPlaying(guildId);

      return true;
    } catch (error) {
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

    await this.deleteNowPlaying(guildId);

    const embed = createNowPlayingEmbed(guildId, false, 0);
    if (!embed) return;

    const buttons = createMusicButtons(false);

    try {
      const ch = await gp.client.channels.fetch(queue.textChannelId);
      if (ch && ch.isTextBased()) {
        const msg = await (ch as TextChannel).send({
          embeds: [embed],
          components: [buttons],
        });
        gp.nowPlayingMessage = msg;
      }
    } catch {
      // Ignore send errors
    }
  }

  async deleteNowPlayingPublic(guildId: string): Promise<void> {
    await this.deleteNowPlaying(guildId);
  }

  private async deleteNowPlaying(guildId: string): Promise<void> {
    const gp = this.players.get(guildId);
    if (!gp?.nowPlayingMessage) return;

    try {
      await gp.nowPlayingMessage.delete();
    } catch {
      // Ignore delete errors
    }
    gp.nowPlayingMessage = null;
  }

  async handleButton(interaction: ButtonInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const gp = this.players.get(guildId);
    if (!gp) {
      await interaction.reply({
        content: '❌ Không có phiên nhạc nào.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const member = interaction.member as any;
    const userVoiceChannelId = member?.voice?.channelId;
    if (!userVoiceChannelId) {
      await interaction.reply({
        content: '❌ Bạn cần ở trong kênh thoại.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const qm = getQueueManager();

    switch (interaction.customId) {
      case 'music_pause': {
        if (this.isPaused(guildId)) {
          this.resume(guildId);
          const embed = createNowPlayingEmbed(
            guildId,
            false,
            this.getElapsed(guildId),
          );
          const buttons = createMusicButtons(false);
          if (embed) {
            await interaction.update({
              embeds: [embed],
              components: [buttons],
            });
          } else {
            await interaction.deferUpdate();
          }
        } else {
          this.pause(guildId);
          const embed = createNowPlayingEmbed(
            guildId,
            true,
            this.getElapsed(guildId),
          );
          const buttons = createMusicButtons(true);
          if (embed) {
            await interaction.update({
              embeds: [embed],
              components: [buttons],
            });
          } else {
            await interaction.deferUpdate();
          }
        }
        break;
      }

      case 'music_skip': {
        const next = qm.skip(guildId, 1);
        if (next) {
          await interaction.deferUpdate();
          await this.play(guildId, gp.client || undefined);
        } else {
          this.stop(guildId);
          await this.deleteNowPlaying(guildId);
          await interaction.reply({
            content: '⏹️ Hết queue rồi!',
          });
        }
        break;
      }

      case 'music_prev': {
        const prevTrack = qm.prev(guildId);
        if (prevTrack) {
          await interaction.deferUpdate();
          await this.play(guildId, gp.client || undefined);
        } else {
          await interaction.reply({
            content: '❌ Không có bài trước đó.',
            flags: MessageFlags.Ephemeral,
          });
        }
        break;
      }

      case 'music_stop': {
        this.stop(guildId);
        await this.deleteNowPlaying(guildId);
        await interaction.reply({
          content: '⏹️ Đã dừng phát nhạc.',
        });
        break;
      }

      case 'music_lyrics': {
        const current = qm.getCurrent(guildId);
        if (!current) {
          await interaction.reply({
            content: '❌ Không có bài đang phát.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.deferReply();

        try {
          const api = getMusicApi();
          const trackName = current.track.title;
          const artistName = current.track.artist || trackName;

          const result = await api.getLyrics(trackName, artistName);
          if (!result || !result.plainLyrics) {
            await interaction.editReply('❌ Không tìm thấy lời bài hát này.');
            return;
          }

          const { truncate } = await import('./utils');
          const lyricsText = truncate(result.plainLyrics, 3900);

          const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setTitle(`📝 ${result.trackName}`)
            .setDescription(lyricsText)
            .setFooter({
              text: `${result.artistName}${result.albumName ? ` • ${result.albumName}` : ''}`,
            });

          await interaction.editReply({ embeds: [embed] });
        } catch (error: any) {
          console.error('[MusicButton] Lyrics Error:', error);
          await interaction.editReply(
            `❌ ${error.message || 'Không thể lấy lời bài hát.'}`,
          );
        }
        break;
      }

      default:
        await interaction.deferUpdate();
    }
  }

  private async onTrackEnd(guildId: string): Promise<void> {
    const gp = this.players.get(guildId);

    if (gp?.stopping) return;

    if (gp?.switching) return;

    // Guard: if player has already moved on to a new track, ignore this stale event
    if (gp?.player.state.status !== AudioPlayerStatus.Idle) return;

    const qm = getQueueManager();

    if (qm.hasNext(guildId)) {
      qm.skip(guildId, 1, true);
      await this.play(guildId, gp?.client || undefined);
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Ignore resolve errors
    }
  }
}

let _instance: PlayerManager | null = null;
export function getPlayerManager(): PlayerManager {
  if (!_instance) _instance = new PlayerManager();
  return _instance;
}
