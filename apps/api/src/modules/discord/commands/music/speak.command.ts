import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import {
  getSpeakManager,
  type SpeakLanguage,
} from '../../services/speak/speak-manager';
import { getPlayerManager } from '../../services/music/player-manager';

const speak: ActionCommand = {
  name: 'speak',
  description: 'Bot đọc chat trong kênh này ra giọng nói ở kênh thoại của bạn',
  category: 'music',
  optionalArgs: [
    {
      name: 'language',
      description: 'Ngôn ngữ đọc (mặc định: Tiếng Việt)',
      type: 'STRING',
      required: false,
      choices: [
        { name: 'Tiếng Việt', value: 'vi' },
        { name: 'English', value: 'en' },
      ],
    },
  ],

  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) {
      await ctx.reply('❌ Lệnh này chỉ dùng được trong server.');
      return;
    }

    const voiceChannel = ctx.voiceChannel;
    if (!voiceChannel) {
      await ctx.reply('❌ Bạn cần vào một kênh thoại trước!');
      return;
    }

    // Speak and music share the voice connection — don't allow both at once.
    if (getPlayerManager().isPlaying(ctx.guildId)) {
      await ctx.reply(
        '❌ Bot đang phát nhạc. Hãy dừng nhạc (`/stop`) trước khi dùng /speak.',
      );
      return;
    }

    const speakManager = getSpeakManager();
    if (speakManager.isActive(ctx.guildId)) {
      await ctx.reply(
        'ℹ️ Bot đã đang đọc chat rồi. Dùng `/stop_speak` để dừng.',
      );
      return;
    }

    const language = ((ctx.getOption('language', 'string') as string) ||
      'vi') as SpeakLanguage;

    await ctx.defer();
    try {
      await speakManager.start(voiceChannel, ctx.channelId!, language);
      const langLabel = language === 'en' ? 'English' : 'Tiếng Việt';
      await ctx.reply(
        `🔊 Bắt đầu đọc chat trong kênh này (${langLabel}). Dùng \`/stop_speak\` để dừng.`,
      );
    } catch {
      await ctx.reply('❌ Không thể vào kênh thoại để đọc chat.');
    }
  },
};

export default speak;
