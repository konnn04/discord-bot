import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { BotClient } from '../../bot/types/bot.types';
import { MusicService } from '../../services/MusicService';
import { authenticate } from '@api/middleware/auth';
import { I18nService } from '@src/services/I18nService';
import { User } from '@shared/types/api.types';

interface AuthenticatedRequest extends FastifyRequest {
    user: User;
}

export const musicRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = app.discordBot as BotClient;

  const checkMusicPermission = async (req: AuthenticatedRequest, reply: FastifyReply, guildId: string): Promise<boolean> => {
      const user = req.user;
      if (!user) return false;

      
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


      const botVoiceChannel = guild.members.me?.voice.channelId;
      if (!botVoiceChannel) {
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

  app.post('/:guildId/next', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { guildId } = req.params as { guildId: string };
      
      if (!await checkMusicPermission(req as AuthenticatedRequest, reply, guildId)) return;
      
      const queue = MusicService.getQueue(guildId);
      if (!queue) {
          return { playing: false, queue: [] };
      }

      MusicService.skip(guildId);
      return { success: true };
  });

  app.get('/:guildId/state', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { guildId } = req.params as { guildId: string };
      const queue = MusicService.getQueue(guildId);
      const guild = client.guilds.cache.get(guildId);
      const voiceChannel = guild?.members?.me?.voice?.channel;
      
      if (!queue) {
          return { 
              playing: false, 
              queue: [],
              guildName: guild?.name,
              voiceChannelName: voiceChannel?.name,
          };
      }

      return {
          playing: queue.playing,
          currentSong: queue.songs[0] || null,
          queue: queue.songs,
          volume: queue.volume,
          loop: queue.loop,
          position: queue.currentResource?.playbackDuration || 0,
          guildName: guild?.name,
          voiceChannelName: voiceChannel?.name,
      };
  });

  const getWritableChannel = (guild: any, voiceChannel?: any) => {
      const me = guild.members.me;
      if (!me) return null;

      if (voiceChannel && voiceChannel.send && voiceChannel.permissionsFor(me).has('SendMessages')) {
          return voiceChannel;
      }

      const preferred = guild.channels.cache.find((c: any) => 
          c.isTextBased() && 
          ['music', 'music-bot', 'bot', 'commands'].some((name: string) => c.name.includes(name)) &&
          c.permissionsFor(me).has(['ViewChannel', 'SendMessages'])
      );
      if (preferred) return preferred;

      if (guild.systemChannel && guild.systemChannel.permissionsFor(me).has('SendMessages')) {
          return guild.systemChannel;
      }
      
      return guild.channels.cache.find((c: any) => 
          c.isTextBased() && 
          c.permissionsFor(me).has(['ViewChannel', 'SendMessages'])
      );
  };

  app.post('/:guildId/control', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { guildId } = req.params as { guildId: string };
      const body = req.body as { action: string, value?: any };
      
      const allowed = await checkMusicPermission(req as unknown as AuthenticatedRequest, reply, guildId);
      if (!allowed) return;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return reply.code(404).send({ error: 'Guild not found' });
      const member = await guild.members.fetch((req.user as any).id);

      const sendFeedback = (message: string) => {
           const queue = MusicService.getQueue(guildId);
           let channel = queue?.textChannel;

           if (!channel) {
               const me = guild.members.me;
               const botVoice = me?.voice.channel;
               if (botVoice && (botVoice as any).send && me && botVoice.permissionsFor(me).has('SendMessages')) {
                   channel = botVoice as any;
               }
           }
           
           if (!channel) {
                channel = getWritableChannel(guild) as any;
           }

           if (channel) channel.send(`[Web] **${member.user.username}**: ${message}`);
      };

      if (body.action === 'join') {
           const member = await guild.members.fetch((req.user as any).id);
           if (member.voice.channel) {
               const textChannel = getWritableChannel(guild, member.voice.channel) as any;
               await MusicService.join(guild, member.voice.channel, textChannel); 
               sendFeedback('Joined voice channel.');
               return { success: true };
           }
      }

      switch (body.action) {
          case 'play':
              MusicService.resume(guildId);
              sendFeedback(await I18nService.t(guildId, 'music.resumedPlayback'));
              break;
          case 'pause':
              MusicService.pause(guildId);
              sendFeedback(await I18nService.t(guildId, 'music.pausedPlayback'));
              break;
          case 'skip':
              MusicService.skip(guildId);
              sendFeedback(await I18nService.t(guildId, 'music.skipped'));
              break;
          case 'stop':
              MusicService.stop(guildId);
              sendFeedback(await I18nService.t(guildId, 'music.stoppedPlayback'));
              break;
          case 'volume':
              if (typeof body.value === 'number') {
                  MusicService.setVolume(guildId, body.value);
                  sendFeedback(await I18nService.t(guildId, 'music.volumeSet', { level: body.value }));
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
       
       let finalLyrics = null;
       if (lyrics) {
           if (Array.isArray(lyrics.syncedLyrics) && lyrics.syncedLyrics.length > 0) {
               finalLyrics = lyrics.syncedLyrics;
           } else {
               finalLyrics = lyrics.plainLyrics;
           }
       }
       
       return { lyrics: finalLyrics };
  });

  app.post('/:guildId/play', {
    onRequest: [authenticate]
  }, async (req, reply) => {
     const { guildId } = req.params as { guildId: string };
     const { query, forceSingle } = req.body as { query: string, forceSingle?: boolean };

     const allowed = await checkMusicPermission(req as unknown as AuthenticatedRequest, reply, guildId);
     if (!allowed) return;

     const guild = client.guilds.cache.get(guildId);
     const member = await guild!.members.fetch((req.user as any).id);
     
     const textChannel = getWritableChannel(guild, member.voice.channel) as any;

     if (member.voice.channel && textChannel) {
        const safeUser = member.user.username.replace(/([*_`~])/g, '\\$1');
        textChannel.send(await I18nService.t(guildId, 'music.addedByDashboard', { user: safeUser }));
        await MusicService.play(guild!, member.voice.channel, textChannel, query, member.user, { forceSingle });
        return { success: true };
     } else {
         return reply.code(400).send({ error: 'Cannot find voice/text channel' });
     }
  });
};
