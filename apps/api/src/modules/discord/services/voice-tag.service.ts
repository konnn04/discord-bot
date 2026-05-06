/**
 * Auto-manages a Discord role per voice/stage channel so members can be @mentioned.
 *
 * - Roles: no perms, no color, not hoisted, positioned at bottom
 * - Mapping: persisted in VoiceChannelRole table, cached in-memory for 0-latency reads
 * - Voice events: buffered & deduplicated, flushed every 2s to respect Discord rate limits
 * - Startup: batch-reconciles per guild (1 DB query each, no N+1)
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GuildSettingsService } from '../../settings/guild-settings.service';
import type {
  Client,
  Guild,
  VoiceChannel,
  StageChannel,
  Role,
  GuildMember,
  User,
} from 'discord.js';
import { AuditLogEvent, ChannelType, EmbedBuilder } from 'discord.js';

const ROLE_NAME_PREFIX = '📢 {} members';
const FLUSH_INTERVAL_MS = 2000;

interface VoiceTagTask {
  action: 'add' | 'remove';
  guildId: string;
  userId: string;
  roleId: string;
  memberTag: string;
}

@Injectable()
export class VoiceTagService {
  private readonly logger = new Logger(VoiceTagService.name);
  private readonly taskBuffer = new Map<string, VoiceTagTask>();
  private readonly recordCache = new Map<
    string,
    { channelId: string; roleId: string } | null
  >();
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private discordClient: Client | null = null;

  constructor(
    private prisma: PrismaService,
    private guildSettings: GuildSettingsService,
  ) {
    this.flushTimer = setInterval(
      () => this.flushTaskBuffer(),
      FLUSH_INTERVAL_MS,
    );
  }

  setClient(client: Client): void {
    this.discordClient = client;
  }

  onDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ── Task buffer (dedup & batch) ─────────────────────────────────

  private taskKey(guildId: string, userId: string, roleId: string): string {
    return `${guildId}:${userId}:${roleId}`;
  }

  /** Last-write-wins; conflicting add+remove for same user+role cancel out */
  private enqueueTask(task: VoiceTagTask): void {
    const key = this.taskKey(task.guildId, task.userId, task.roleId);
    const existing = this.taskBuffer.get(key);
    if (existing && existing.action !== task.action) {
      this.taskBuffer.delete(key);
    } else {
      this.taskBuffer.set(key, task);
    }
  }

  /** Process buffer per guild sequentially; retries on 429 / 5xx */
  private async flushTaskBuffer(): Promise<void> {
    if (this.isFlushing || this.taskBuffer.size === 0 || !this.discordClient)
      return;

    this.isFlushing = true;
    const tasks = [...this.taskBuffer.values()];
    this.taskBuffer.clear();

    const byGuild = new Map<string, VoiceTagTask[]>();
    for (const t of tasks) {
      const arr = byGuild.get(t.guildId) || [];
      arr.push(t);
      byGuild.set(t.guildId, arr);
    }

    let succeeded = 0;
    let failed = 0;

    for (const [guildId, guildTasks] of byGuild) {
      const guild = this.discordClient.guilds.cache.get(guildId);
      if (!guild) continue;

      for (const task of guildTasks) {
        try {
          const member = await guild.members
            .fetch(task.userId)
            .catch(() => null);
          if (!member) continue;

          const role = guild.roles.cache.get(task.roleId);
          if (!role) continue;

          if (task.action === 'add' && !member.roles.cache.has(role.id)) {
            await member.roles.add(role, 'Voice tag: joined channel');
          } else if (
            task.action === 'remove' &&
            member.roles.cache.has(role.id)
          ) {
            await member.roles.remove(role, 'Voice tag: left channel');
          }
          succeeded++;
        } catch (err: any) {
          failed++;
          if (err.code === 429 || err.code >= 500) this.enqueueTask(task);
        }
      }
    }

    if (succeeded > 0 || failed > 0) {
      this.logger.debug(
        `[VoiceTag] Flushed ${succeeded} tasks${failed > 0 ? `, ${failed} failed` : ''}`,
      );
    }

    this.isFlushing = false;
  }

  // ── Feature toggle ──────────────────────────────────────────────

  async enable(guild: Guild): Promise<string> {
    const guildId = guild.id;

    const current = this.guildSettings.get(guildId);
    this.guildSettings.update(guildId, {
      features: { ...current.features, tagMembersInVoice: true },
    });

    const voiceChannels = this.getVoiceAndStageChannels(guild);
    if (voiceChannels.length === 0) {
      return '✅ Đã bật tính năng tag thành viên trong kênh thoại. Hiện chưa có kênh voice/stage nào.';
    }

    await this.warmRecordCache(guildId);

    let created = 0;
    let assigned = 0;
    for (const ch of voiceChannels) {
      const role = await this.createRoleForChannel(guild, ch);
      if (role) {
        created++;
        assigned += await this.syncChannelMembers(ch, role);
      }
    }

    this.logger.log(
      `[VoiceTag] Enabled for guild ${guildId}: ${created} roles, ${assigned} members tagged`,
    );
    return `✅ Đã bật tính năng tag thành viên. Đã tạo ${created} role cho ${voiceChannels.length} kênh voice/stage, gắn cho ${assigned} thành viên.`;
  }

  async disable(guild: Guild): Promise<string> {
    const guildId = guild.id;

    const current = this.guildSettings.get(guildId);
    this.guildSettings.update(guildId, {
      features: { ...current.features, tagMembersInVoice: false },
    });

    const records = await this.prisma.client.voiceChannelRole.findMany({
      where: { guildId },
    });

    let deleted = 0;
    for (const rec of records) {
      try {
        const role = guild.roles.cache.get(rec.roleId);
        if (role) await role.delete('Voice tag feature disabled');
        deleted++;
      } catch {
        /* role already gone or missing perms */
      }
    }

    await this.prisma.client.voiceChannelRole.deleteMany({
      where: { guildId },
    });
    this.invalidateGuildCache(guildId);

    this.logger.log(
      `[VoiceTag] Disabled for guild ${guildId}: ${deleted} roles deleted`,
    );
    return `✅ Đã tắt tính năng tag thành viên. Đã xóa ${deleted} role.`;
  }

  isEnabled(guildId: string): boolean {
    return this.guildSettings.isFeatureEnabled(guildId, 'tagMembersInVoice');
  }

  // ── Voice state events ──────────────────────────────────────────

  /** Enqueues role-add; triggers background role recreation if missing */
  onMemberJoin(
    guild: Guild,
    member: GuildMember,
    channelId: string,
  ): Promise<void> {
    if (!this.isEnabled(guild.id) || member.user.bot) return Promise.resolve();

    return this.getRecord(guild.id, channelId).then((record) => {
      if (!record) return;

      if (!guild.roles.cache.has(record.roleId)) {
        const voiceCh = guild.channels.cache.get(channelId) as
          | VoiceChannel
          | StageChannel
          | undefined;
        if (
          voiceCh &&
          (voiceCh.type === ChannelType.GuildVoice ||
            voiceCh.type === ChannelType.GuildStageVoice)
        ) {
          this.createRoleForChannel(guild, voiceCh).catch(() => {});
        }
        return;
      }

      if (member.roles.cache.has(record.roleId)) return;

      this.enqueueTask({
        action: 'add',
        guildId: guild.id,
        userId: member.id,
        roleId: record.roleId,
        memberTag: member.user.tag,
      });
    });
  }

  onMemberLeave(
    guild: Guild,
    member: GuildMember,
    oldChannelId: string,
  ): Promise<void> {
    if (!this.isEnabled(guild.id) || member.user.bot) return Promise.resolve();

    return this.getRecord(guild.id, oldChannelId).then((record) => {
      if (!record) return;
      if (!member.roles.cache.has(record.roleId)) return;

      this.enqueueTask({
        action: 'remove',
        guildId: guild.id,
        userId: member.id,
        roleId: record.roleId,
        memberTag: member.user.tag,
      });
    });
  }

  // ── Channel / role lifecycle ────────────────────────────────────

  async onChannelDelete(guild: Guild, channelId: string): Promise<void> {
    if (!this.isEnabled(guild.id)) return;

    const record = await this.getRecord(guild.id, channelId);
    if (!record) return;

    try {
      const role = guild.roles.cache.get(record.roleId);
      if (role) await role.delete('Voice channel deleted');
    } catch {
      /* role already gone */
    }

    await this.prisma.client.voiceChannelRole.delete({
      where: { guildId_channelId: { guildId: guild.id, channelId } },
    });
    this.invalidateRecordCache(guild.id, channelId);

    this.logger.log(
      `[VoiceTag] Channel ${channelId} deleted — role ${record.roleId} cleaned up`,
    );
  }

  /** If a tracked role is deleted manually, recreates it and DMs the deleter */
  async onRoleDelete(guild: Guild, role: Role): Promise<void> {
    if (!this.isEnabled(guild.id)) return;

    const record = await this.prisma.client.voiceChannelRole.findFirst({
      where: { guildId: guild.id, roleId: role.id },
    });
    if (!record) return;

    let deleter: User | null = null;
    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 1,
      });
      const entry = auditLogs.entries.first();
      if (entry && entry.targetId === role.id) {
        deleter = (entry.executor as User) ?? null;
      }
    } catch {
      /* missing audit log perms */
    }

    const voiceCh = guild.channels.cache.get(record.channelId) as
      | VoiceChannel
      | StageChannel
      | undefined;
    if (
      !voiceCh ||
      (voiceCh.type !== ChannelType.GuildVoice &&
        voiceCh.type !== ChannelType.GuildStageVoice)
    ) {
      await this.prisma.client.voiceChannelRole.delete({
        where: {
          guildId_channelId: { guildId: guild.id, channelId: record.channelId },
        },
      });
      return;
    }

    const newRole = await this.createRoleForChannel(guild, voiceCh);
    if (!newRole) return;

    await this.syncChannelMembers(voiceCh, newRole);

    if (deleter && !deleter.bot) {
      try {
        await deleter.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf59e0b)
              .setTitle('⚠️ Role tự động đã bị xóa')
              .setDescription(
                `Role **${role.name}** cho kênh <#${record.channelId}> đã bị xóa và được khôi phục tự động.\n\n` +
                  'Role này được bot quản lý cho tính năng **tag thành viên trong kênh thoại**.\n' +
                  'Không thể xóa thủ công — nếu muốn tắt, dùng lệnh `/settings voicetag off`.',
              ),
          ],
        });
      } catch {
        /* DMs closed */
      }
    }

    this.logger.warn(
      `[VoiceTag] Role ${role.id} deleted in guild ${guild.id} — recreated as ${newRole.id}`,
    );
  }

  // ── Startup reconciliation ──────────────────────────────────────

  async reconcileAll(client: Client): Promise<void> {
    this.logger.log('[VoiceTag] Starting startup reconciliation...');
    let totalCreated = 0;
    let totalDeleted = 0;
    let totalSynced = 0;

    for (const [, guild] of client.guilds.cache) {
      if (!this.isEnabled(guild.id)) continue;

      try {
        const { created, deleted, synced } = await this.reconcileGuild(guild);
        totalCreated += created;
        totalDeleted += deleted;
        totalSynced += synced;
      } catch (err: any) {
        this.logger.error(
          `[VoiceTag] Reconciliation failed for guild ${guild.id}: ${err.message}`,
        );
      }
    }

    this.logger.log(
      `[VoiceTag] Reconciliation done: +${totalCreated} roles, -${totalDeleted} stale, ~${totalSynced} members`,
    );
  }

  private async reconcileGuild(
    guild: Guild,
  ): Promise<{ created: number; deleted: number; synced: number }> {
    const guildId = guild.id;
    let created = 0;
    let deleted = 0;
    let synced = 0;

    await this.warmRecordCache(guildId);

    const dbRecords = await this.prisma.client.voiceChannelRole.findMany({
      where: { guildId },
    });
    const dbMap = new Map(dbRecords.map((r) => [r.channelId, r]));

    const voiceChannels = this.getVoiceAndStageChannels(guild);
    const currentChannelIds = new Set(voiceChannels.map((c) => c.id));

    for (const [, record] of dbMap) {
      if (!currentChannelIds.has(record.channelId)) {
        try {
          const staleRole = guild.roles.cache.get(record.roleId);
          if (staleRole) {
            await staleRole.delete('Channel no longer exists').catch(() => {});
          }
        } catch {
          /* already gone */
        }
        await this.prisma.client.voiceChannelRole.delete({
          where: {
            guildId_channelId: {
              guildId,
              channelId: record.channelId,
            },
          },
        });
        deleted++;
      }
    }

    for (const ch of voiceChannels) {
      const record = dbMap.get(ch.id);
      let role = record ? guild.roles.cache.get(record.roleId) : undefined;

      if (!role) {
        const newRole = await this.createRoleForChannel(guild, ch);
        if (newRole) {
          role = newRole;
          created++;
        }
      }

      if (role) {
        synced += await this.syncChannelMembers(ch, role);
      }
    }

    if (created > 0 || deleted > 0 || synced > 0) {
      this.logger.log(
        `[VoiceTag] Guild ${guild.name}: +${created} roles, -${deleted} stale, ~${synced} members`,
      );
    }

    return { created, deleted, synced };
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private getVoiceAndStageChannels(
    guild: Guild,
  ): (VoiceChannel | StageChannel)[] {
    const channels: (VoiceChannel | StageChannel)[] = [];
    for (const [, ch] of guild.channels.cache) {
      if (
        ch.type === ChannelType.GuildVoice ||
        ch.type === ChannelType.GuildStageVoice
      ) {
        channels.push(ch);
      }
    }
    return channels;
  }

  private async createRoleForChannel(
    guild: Guild,
    channel: VoiceChannel | StageChannel,
  ): Promise<Role | null> {
    const guildId = guild.id;
    const roleName = ROLE_NAME_PREFIX.replace('{}', channel.name);

    const existing = guild.roles.cache.find((r) => r.name === roleName);
    if (existing) {
      await this.prisma.client.voiceChannelRole.upsert({
        where: { guildId_channelId: { guildId, channelId: channel.id } },
        update: { roleId: existing.id },
        create: { guildId, channelId: channel.id, roleId: existing.id },
      });
      return existing;
    }

    try {
      const role = await guild.roles.create({
        name: roleName,
        permissions: [],
        color: 0x000000,
        hoist: false,
        mentionable: true,
        reason: 'Auto voice channel tag role',
      });

      try {
        await role.setPosition(1, {
          reason: 'Auto voice tag: bottom position',
        });
      } catch {
        /* best-effort: position 1 may fail if above @everyone */
      }

      await this.prisma.client.voiceChannelRole.upsert({
        where: { guildId_channelId: { guildId, channelId: channel.id } },
        update: { roleId: role.id },
        create: { guildId, channelId: channel.id, roleId: role.id },
      });

      this.recordCache.set(`${guildId}:${channel.id}`, {
        channelId: channel.id,
        roleId: role.id,
      });

      return role;
    } catch (err: any) {
      this.logger.error(
        `[VoiceTag] Failed to create role for channel ${channel.id} in guild ${guildId}: ${err.message}`,
      );
      return null;
    }
  }

  private async syncChannelMembers(
    channel: VoiceChannel | StageChannel,
    role: Role,
  ): Promise<number> {
    let fixed = 0;

    const inChannel = channel.members.filter((m) => !m.user.bot);
    const withRole = role.members.filter((m) => !m.user.bot);

    const addPromises: Promise<void>[] = [];
    for (const [, member] of inChannel) {
      if (!member.roles.cache.has(role.id)) {
        addPromises.push(
          member.roles
            .add(role, 'Reconciliation: voice channel tag')
            .then(() => {
              fixed++;
            })
            .catch(() => {}),
        );
      }
    }
    await Promise.all(addPromises);

    const removePromises: Promise<void>[] = [];
    for (const [, member] of withRole) {
      if (!inChannel.has(member.id)) {
        removePromises.push(
          member.roles
            .remove(
              role,
              'Reconciliation: left voice channel while bot offline',
            )
            .then(() => {
              fixed++;
            })
            .catch(() => {}),
        );
      }
    }
    await Promise.all(removePromises);

    return fixed;
  }

  // ── Record cache ────────────────────────────────────────────────

  private async getRecord(
    guildId: string,
    channelId: string,
  ): Promise<{ channelId: string; roleId: string } | null> {
    const cacheKey = `${guildId}:${channelId}`;
    const cached = this.recordCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const record = await this.prisma.client.voiceChannelRole.findUnique({
      where: { guildId_channelId: { guildId, channelId } },
    });
    this.recordCache.set(cacheKey, record ?? null);
    return record;
  }

  private invalidateRecordCache(guildId: string, channelId: string): void {
    this.recordCache.delete(`${guildId}:${channelId}`);
  }

  private async warmRecordCache(guildId: string): Promise<void> {
    const records = await this.prisma.client.voiceChannelRole.findMany({
      where: { guildId },
    });
    for (const r of records) {
      this.recordCache.set(`${guildId}:${r.channelId}`, r);
    }
  }

  private invalidateGuildCache(guildId: string): void {
    for (const key of this.recordCache.keys()) {
      if (key.startsWith(`${guildId}:`)) this.recordCache.delete(key);
    }
  }
}
