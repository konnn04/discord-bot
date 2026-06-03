import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getPlayerManager } from '../services/music/player-manager';
import { getQueueManager } from '../services/music/queue-manager';

import type { MusicState } from 'shared/src/types/music.types';

@WebSocketGateway({
  namespace: '/music',
  cors: { origin: '*' },
})
export class MusicGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private guildSubs = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    console.log(`[Music WS] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Music WS] Client disconnected: ${client.id}`);
    for (const [, sockets] of this.guildSubs) {
      sockets.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, guildId: string) {
    if (!this.guildSubs.has(guildId)) {
      this.guildSubs.set(guildId, new Set());
    }
    this.guildSubs.get(guildId)!.add(client.id);
    void client.join(guildId);

    // Push state immediately
    const state = this.getMusicState(guildId);
    if (state) client.emit('state', state);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, guildId: string) {
    const sockets = this.guildSubs.get(guildId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.guildSubs.delete(guildId);
    }
    void client.leave(guildId);
  }

  /** Broadcast current state to all subscribers in a guild. Called from controller after mutations. */
  broadcastState(guildId: string) {
    const state = this.getMusicState(guildId);
    if (state) {
      this.server.to(guildId).emit('state', state);
    }
  }

  getMusicState(guildId: string): MusicState | null {
    const pm = getPlayerManager();
    const qm = getQueueManager();

    const isPlaying = pm.isPlaying(guildId);
    const isPaused = pm.isPaused(guildId);
    const volume = qm.getVolume(guildId);
    const current = qm.getCurrent(guildId);
    const elapsed = pm.getElapsed(guildId);
    const loopMode = qm.get(guildId)?.loopMode ?? 'off';

    const queueData = qm.getPage(guildId, 1);
    const allTracks = queueData.tracks.map((t) => ({
      ...t.track,
      requestedBy: t.requestedBy,
    }));

    let voiceChannelId: string | null = null;
    let voiceChannelName: string | null = null;
    if (pm.isConnected(guildId)) {
      const gp = pm.getGuildPlayer(guildId);
      if (gp) {
        const vc = gp.connection.joinConfig.channelId;
        voiceChannelId = vc ?? null;
        try {
          const ch = gp.client?.channels.cache.get(vc ?? '');
          if (ch && 'name' in ch) voiceChannelName = (ch as any).name;
        } catch {
          /* ignore */
        }
      }
    }

    return {
      guildId,
      playerState:
        isPlaying || isPaused
          ? {
              isPlaying,
              isPaused,
              currentTrack: current
                ? { ...current.track, requestedBy: current.requestedBy }
                : null,
              position: elapsed,
              volume,
              loop: loopMode,
              shuffle: false,
            }
          : null,
      queue: allTracks.slice(queueData.currentIndex + 1),
      history: allTracks.slice(0, queueData.currentIndex),
      voiceChannelId,
      voiceChannelName,
    };
  }
}
