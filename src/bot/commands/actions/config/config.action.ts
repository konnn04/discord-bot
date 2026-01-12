import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { GuildSettingsService } from '@services/GuildSettingsService';
import { I18nService } from '@services/I18nService';
import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export const configAction: ActionCommand = {
  name: 'config',
  description: 'Manage server configuration',
  helpDescription: 'Configure bot settings for this server (Admins only). Usage: `/config language <code_iso>`',
  isOnlySlashCommand: true,
  optionalArgs: [
    {
        name: 'setting',
        description: 'The setting to configure',
        type: 'STRING',
        required: true,
        choices: [
            { name: 'Language', value: 'language' },
            { name: 'Voice Logging', value: 'voice_log' }
        ]
    },
    {
        name: 'value',
        description: 'The new value for the setting',
        type: 'STRING',
        required: true
    }
  ],
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;

    // Check Admin Pems
    const member = ctx.member;
    if (!member || (typeof member.permissions !== 'string' && !member.permissions.has(PermissionFlagsBits.Administrator))) {
        await ctx.reply(`❌ ${await I18nService.t(ctx.guildId, 'common.error')} Unauthorized.`);
        return;
    }

    const setting = ctx.getOption('setting') as string;
    const value = ctx.getOption('value') as string;

    if (setting === 'language') {
        const supported = ['en', 'vi'];
        if (!supported.includes(value)) {
            await ctx.reply(await I18nService.t(ctx.guildId, 'config.unsupported', { supported: supported.join(', ') }));
            return;
        }

        await GuildSettingsService.update(ctx.guildId, { language: value });
        I18nService.invalidate(ctx.guildId);
        
        // Reply in the new language
        const msg = await I18nService.t(ctx.guildId, 'config.languageSet', { lang: value });
        await ctx.reply(msg);
    } 
    
    else if (setting === 'voice_log') {
        const enabled = ['true', 'on', 'yes', '1', 'enable'].includes(value.toLowerCase());
        await GuildSettingsService.update(ctx.guildId, { voiceLogEnabled: enabled });
        
        const statusKey = enabled ? 'common.enabled' : 'common.disabled';
        const status = await I18nService.t(ctx.guildId, statusKey);
        
        await ctx.reply(await I18nService.t(ctx.guildId, 'config.voiceLogSet', { value: status }));
    }
    
    else {
        await ctx.reply(await I18nService.t(ctx.guildId, 'config.unknown'));
    }
  },
};

export default configAction;
