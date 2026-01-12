import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { I18nService } from '@services/I18nService';
import { config } from '@config/env';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Attachment } from 'discord.js';

export const updateCookies: ActionCommand = {
    name: 'updatecookies',
    description: 'Update YouTube cookies (Developer only)',
    isOnlySlashCommand: true,
    optionalArgs: [
        { 
            name: 'yt_cookie', 
            description: 'yt.txt file (Netscape format)', 
            type: 'ATTACHMENT', 
            required: false 
        },
        { 
            name: 'yt_music_cookie', 
            description: 'yt-music.txt file (Netscape format)', 
            type: 'ATTACHMENT', 
            required: false 
        }
    ],
    async execute(ctx: ContextAdapter) {
        // 1. Check Developer Permission
        if (!config.developerId.includes(ctx.userId)) {
             await ctx.reply(`❌ ${await I18nService.t(ctx.guildId, 'common.unauthorized')}`);
             return;
        }

        // 2. Get Attachments
        const yt = ctx.getOption('yt_cookie', 'attachment') as Attachment | null;
        const ytMusic = ctx.getOption('yt_music_cookie', 'attachment') as Attachment | null;

        if (!yt && !ytMusic) {
             await ctx.reply(await I18nService.t(ctx.guildId, 'music.cookieUploadRequired'));
             return;
        }

        await ctx.defer(true); // Ephemeral reply

        try {
            const binDir = path.join(process.cwd(), 'bin');
            if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

            let updatedFiles = '';

            // 3. Process yt.txt
            if (yt) {
                 const response = await axios.get(yt.url, { responseType: 'arraybuffer' });
                 fs.writeFileSync(path.join(binDir, 'yt.txt'), response.data);
                 updatedFiles += await I18nService.t(ctx.guildId, 'music.cookieUpdatedFile', { file: 'yt.txt' });
            }

            // 4. Process yt-music.txt
            if (ytMusic) {
                 const response = await axios.get(ytMusic.url, { responseType: 'arraybuffer' });
                 fs.writeFileSync(path.join(binDir, 'yt-music.txt'), response.data);
                 updatedFiles += await I18nService.t(ctx.guildId, 'music.cookieUpdatedFile', { file: 'yt-music.txt' });
            }

            await ctx.editReply(await I18nService.t(ctx.guildId, 'music.cookieUpdateSuccess', { files: updatedFiles }));
        } catch (e) {
            console.error('[UpdateCookies] Error:', e);
            await ctx.editReply(await I18nService.t(ctx.guildId, 'music.cookieUpdateError'));
        }
    }
};

export default updateCookies;
