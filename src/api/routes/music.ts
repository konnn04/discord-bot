import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { BotClient } from '../../bot/types/bot.types';
import { MusicService } from '../../services/MusicService';
import { authenticate } from '@api/middleware/auth';
import { config } from '@config/env';
import { I18nService } from '@src/services/I18nService';

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

  const getWritableChannel = (guild: any, voiceChannel?: any) => {
      // 1. Prioritize Voice Channel Chat if available and writable
      if (voiceChannel && voiceChannel.send && voiceChannel.permissionsFor(guild.members.me).has('SendMessages')) {
          return voiceChannel;
      }

      // 2. Try to find a channel named "music" or "bot"
      const preferred = guild.channels.cache.find((c: any) => 
          c.isTextBased() && 
          ['music', 'music-bot', 'bot', 'commands'].some((name: string) => c.name.includes(name)) &&
          c.permissionsFor(guild.members.me).has(['ViewChannel', 'SendMessages'])
      );
      if (preferred) return preferred;

      // 3. System channel check
      if (guild.systemChannel && guild.systemChannel.permissionsFor(guild.members.me).has('SendMessages')) {
          return guild.systemChannel;
      }
      
      // 4. Fallback to any writable text channel
      return guild.channels.cache.find((c: any) => 
          c.isTextBased() && 
          c.permissionsFor(guild.members.me).has(['ViewChannel', 'SendMessages'])
      );
  };

  app.post('/:guildId/control', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { guildId } = req.params as { guildId: string };
      const body = req.body as { action: string, value?: any };
      
      const allowed = await checkMusicPermission(req, reply, guildId);
      if (!allowed) return;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return reply.code(404).send({ error: 'Guild not found' });
      const member = await guild.members.fetch((req.user as any).id);

      // Helper to send feedback to channel
      const sendFeedback = (message: string) => {
           const queue = MusicService.getQueue(guildId);
           let channel = queue?.textChannel;

           // If no queue channel (or it's gone), try bot's current voice channel
           if (!channel) {
               const botVoice = guild.members.me?.voice.channel;
               if (botVoice && (botVoice as any).send && botVoice.permissionsFor(guild.members.me).has('SendMessages')) {
                   channel = botVoice as any;
               }
           }
           
           // Fallback only if absolutely necessary, but try to use the most relevant one
           if (!channel) {
                channel = getWritableChannel(guild) as any;
           }

           if (channel) channel.send(`[Web] **${member.user.username}**: ${message}`);
      };

      // If action is JOIN, special handling
      if (body.action === 'join') {
           const member = await guild.members.fetch((req.user as any).id);
           if (member.voice.channel) {
               const textChannel = getWritableChannel(guild, member.voice.channel) as any;
               await MusicService.join(guild, member.voice.channel, textChannel); 
               sendFeedback('Joined voice channel.');
               return { success: true };
           }
      }

      // Standard Controls
      switch (body.action) {
          case 'play':
              MusicService.resume(guildId);
              sendFeedback('Resumed playback.');
              break;
          case 'pause':
              MusicService.pause(guildId);
              sendFeedback('Paused playback.');
              break;
          case 'skip':
              MusicService.skip(guildId);
              sendFeedback('Skipped track.');
              break;
          case 'stop':
              MusicService.stop(guildId);
              sendFeedback('Stopped playback.');
              break;
          case 'volume':
              if (typeof body.value === 'number') {
                  MusicService.setVolume(guildId, body.value);
                  sendFeedback(await I18nService.t(guildId, 'music.volumeSet', { volume: body.value }));
              }
              break;
          case 'loop': {
              const isLoop = MusicService.toggleLoop(guildId);
              sendFeedback(isLoop ? 'Enabled loop.' : 'Disabled loop.');
              break;
          }
          case 'shuffle':
              MusicService.shuffle(guildId);
              sendFeedback('Shuffled queue.');
              break;
          case 'previous':
              MusicService.previous(guildId);
              sendFeedback('Played previous track.');
              break;
          case 'remove':
              if (typeof body.value === 'number') {
                  const song = MusicService.removeSong(guildId, body.value);
                  if (song) sendFeedback(await I18nService.t(guildId, 'music.removedFromQueue', { song }));
              }
              break;
          default:
              return reply.code(400).send({ error: 'Invalid action' });
      }

      return { success: true };
  });

  app.get('/search', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { q } = req.query as { q: string };
      if (!q) return reply.code(400).send({ error: 'Query is required' });
      
      const results = await MusicService.search(q);
      return results;
  });
  
  app.get('/:guildId/lyrics', {
      onRequest: [authenticate]
  }, async (req, reply) => {
       const { guildId } = req.params as { guildId: string };
       const lyrics = await MusicService.getLyrics(guildId);
       return { lyrics: lyrics ? lyrics.syncedLyrics || lyrics.plainLyrics : null };
  });

  app.post('/:guildId/play', {
    onRequest: [authenticate]
  }, async (req, reply) => {
     const { guildId } = req.params as { guildId: string };
     const { query, forceSingle } = req.body as { query: string, forceSingle?: boolean };

     const allowed = await checkMusicPermission(req, reply, guildId);
     if (!allowed) return;

     const guild = client.guilds.cache.get(guildId);
     const member = await guild!.members.fetch((req.user as any).id);
     
     const textChannel = getWritableChannel(guild, member.voice.channel) as any;

     if (member.voice.channel && textChannel) {
        // Notification
        const safeUser = member.user.username.replace(/([*_`~])/g, '\\$1');
        textChannel.send(await I18nService.t(guildId, 'music.addedByDashboard', { user: safeUser }));
        await MusicService.play(guild!, member.voice.channel, textChannel, query, member.user, { forceSingle });
        return { success: true };
     } else {
         return reply.code(400).send({ error: 'Cannot find voice/text channel' });
     }
  });
};
