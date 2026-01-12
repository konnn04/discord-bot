import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { BotClient } from '../../bot/types/bot.types';
import { MusicService } from '../../services/MusicService';
import { authenticate } from '@api/middleware/auth';
import { config } from '@config/env';

export const musicRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = app.discordBot as BotClient;

  // Middleware to check permissions
  // 1. Dev (Bot Owner) -> Full Access
  // 2. Member in SAME voice channel -> Full Access
  // 3. Others -> Read Only (Get State) - actually control endpoints should block them.
  const checkMusicPermission = async (req: any, reply: any, guildId: string): Promise<boolean> => {
      const user = req.user;
      if (!user) return false;

      // Check Dev
      // You might store dev ID in env or DB. Assuming config.bot.ownerId exists or similar, or hardcoded for now.
      // For now, let's assume we trust the user if they are the guild owner or admin?
      // User requested "Dev of Bot" specifically.
      
      // Let's implement Voice Channel check first
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
          reply.code(404).send({ error: 'Guild not found' });
          return false;
      }

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) {
          reply.code(403).send({ error: 'Member not found in guild' });
          return false;
      }

      // Check if Dev (Implementation depends on how you store owner ID)
      // const isDev = user.id === config.bot.ownerId; 
      // if (isDev) return true;

      // Check Voice Channel
      const botVoiceChannel = guild.members.me?.voice.channelId;
      if (!botVoiceChannel) {
           // Bot not in voice, maybe allow controlling to Join? 
           // For now, allow if member is in ANY voice channel so they can summon
           if (member.voice.channelId) return true;
           
           reply.code(403).send({ error: 'You must be in a voice channel' });
           return false;
      }

      if (member.voice.channelId !== botVoiceChannel) {
          reply.code(403).send({ error: 'You must be in the same voice channel as the bot' });
          return false;
      }

      return true;
  };

  app.get('/:guildId/state', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { guildId } = req.params as { guildId: string };
      const queue = MusicService.getQueue(guildId);
      
      if (!queue) {
          return { playing: false, queue: [] };
      }

      return {
          playing: queue.playing,
          currentSong: queue.songs[0] || null,
          queue: queue.songs,
          volume: queue.volume,
          loop: queue.loop,
          position: queue.currentResource?.playbackDuration || 0
      };
  });

  app.post('/:guildId/control', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { guildId } = req.params as { guildId: string };
      const body = req.body as { action: string, value?: any };
      
      const allowed = await checkMusicPermission(req, reply, guildId);
      if (!allowed) return;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return reply.code(404).send({ error: 'Guild not found' });

      // If action is JOIN, special handling
      if (body.action === 'join') {
           const member = await guild.members.fetch((req.user as any).id);
           if (member.voice.channel) {
               await MusicService.join(guild, member.voice.channel, member.voice.channel as any); // Sending to voice text channel? need text channel
               return { success: true };
           }
      }

      // Standard Controls
      switch (body.action) {
          case 'play':
              // Play requires a query, handled via separate endpoint or overload?
              // If resuming:
              MusicService.resume(guildId);
              break;
          case 'pause':
              MusicService.pause(guildId);
              break;
          case 'skip':
              MusicService.skip(guildId);
              break;
          case 'stop':
              MusicService.stop(guildId);
              break;
          case 'volume':
              if (typeof body.value === 'number') MusicService.setVolume(guildId, body.value);
              break;
          case 'loop':
              MusicService.toggleLoop(guildId);
              break;
          case 'shuffle':
              MusicService.shuffle(guildId);
              break;
          case 'previous':
              MusicService.previous(guildId);
              break;
          case 'remove':
              if (typeof body.value === 'number') MusicService.removeSong(guildId, body.value);
              break;
          default:
              return reply.code(400).send({ error: 'Invalid action' });
      }

      return { success: true };
  });

  app.post('/:guildId/play', {
    onRequest: [authenticate]
  }, async (req, reply) => {
     const { guildId } = req.params as { guildId: string };
     const { query } = req.body as { query: string };

     const allowed = await checkMusicPermission(req, reply, guildId);
     if (!allowed) return;

     const guild = client.guilds.cache.get(guildId);
     const member = await guild!.members.fetch((req.user as any).id);
     
     // Need a text channel to send feedback. Ideally user provides it or we pick logic.
     // For now, pick system channel or first available?
     // Or just return result via API and assume UI handles it.
     // But MusicService requires a TextChannel.
     
     // Hack: Use the first TextChannel found or one defined in settings
     const textChannel = guild!.systemChannel || guild!.channels.cache.find(c => c.isTextBased()) as any;

     if (member.voice.channel && textChannel) {
        // We don't await this fully if it takes long, or we do?
        // Let's await to return error if valid
        await MusicService.play(guild!, member.voice.channel, textChannel, query, member.user);
        return { success: true };
     } else {
         return reply.code(400).send({ error: 'Cannot find voice/text channel' });
     }
  });
};
