import { ActionCommand, PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { GuildSettingsService } from '../../../settings/guild-settings.service';

const settingRoleRank: ActionCommand = {
  name: 'setting_rolerank',
  description: 'Cấu hình cấp role theo level (chỉ cấp 1 role, không cộng dồn)',
  category: 'settings',
  permission: PermissionLevel.ADMIN,
  optionalArgs: [
    {
      name: 'enable',
      description: 'Bật/tắt tính năng cấp role theo level',
      type: 'BOOLEAN',
      required: false,
    },
    {
      name: 'level',
      description: 'Mốc level (dùng khi thêm/xóa luật)',
      type: 'INTEGER',
      minValue: 1,
      required: false,
    },
    {
      name: 'role',
      description: 'Role cấp khi đạt mốc level này',
      type: 'ROLE',
      required: false,
    },
    {
      name: 'remove',
      description: 'Xóa luật ở mốc level đã nhập',
      type: 'BOOLEAN',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps: any) {
    if (!ctx.guildId) {
      await ctx.reply('Lệnh này chỉ dùng được trong server.');
      return;
    }

    const settingsService = deps.guildSettings as GuildSettingsService;
    const current = settingsService.get(ctx.guildId);
    const roleRank = {
      enabled: current.roleRank?.enabled ?? false,
      rules: [...(current.roleRank?.rules ?? [])],
    };

    const enable = ctx.getOption('enable', 'boolean') as boolean | null;
    const level = ctx.getOption('level', 'integer') as number | null;
    const role = ctx.getOption('role', 'role');
    const remove = ctx.getOption('remove', 'boolean') as boolean | null;

    if (typeof enable === 'boolean') {
      roleRank.enabled = enable;
    }

    if (level && remove) {
      roleRank.rules = roleRank.rules.filter((r) => r.level !== level);
    } else if (level && role) {
      // Upsert the rule for this level.
      roleRank.rules = roleRank.rules.filter((r) => r.level !== level);
      roleRank.rules.push({ level, roleId: role.id });
    } else if (level && !role && !remove) {
      await ctx.reply(
        '❌ Cần cung cấp `role` khi thêm luật cho một mốc level.',
      );
      return;
    }

    roleRank.rules.sort((a, b) => a.level - b.level);
    settingsService.update(ctx.guildId, { roleRank });

    const status = roleRank.enabled ? '✅ Bật' : '⛔ Tắt';
    let list = roleRank.rules
      .map((r) => `• Level **${r.level}** → <@&${r.roleId}>`)
      .join('\n');
    if (!list) list = '_Chưa có luật nào._';
    await ctx.reply(
      `**Role Rank** ${status}\n${list}\n\n_Chỉ cấp 1 role tương ứng level cao nhất đạt được (không cộng dồn)._`,
    );
  },
};

export default settingRoleRank;
