import { Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

export interface MemoryEntry {
  key: string;
  value: string;
  metadata?: any;
  updatedAt?: Date;
}

/**
 * Guild-scoped memory service for AI Chatbot.
 * All operations strictly require guildId to ensure complete isolation between servers.
 * Implements an in-memory cache and fallback so functionality remains uninterrupted
 * even during database connection dips.
 */
export class GuildMemoryService {
  private readonly logger = new Logger(GuildMemoryService.name);
  // In-memory cache: guildId -> Map<key, MemoryEntry>
  private readonly memCache = new Map<string, Map<string, MemoryEntry>>();

  constructor(private prisma?: PrismaService) {}

  setPrisma(prisma: PrismaService) {
    this.prisma = prisma;
  }

  private normalizeKey(key: string): string {
    return key.trim().toLowerCase().slice(0, 100);
  }

  /** Save or update a memory entry strictly under the specified guildId */
  async remember(
    guildId: string,
    key: string,
    value: string,
    metadata?: any,
  ): Promise<void> {
    if (!guildId || !key || !value) return;
    const normKey = this.normalizeKey(key);
    const trimmedVal = value.trim().slice(0, 1500);

    // 1. Update in-memory cache for fast local reads
    if (!this.memCache.has(guildId)) {
      this.memCache.set(guildId, new Map());
    }
    const guildMap = this.memCache.get(guildId)!;
    guildMap.set(normKey, {
      key: normKey,
      value: trimmedVal,
      metadata,
      updatedAt: new Date(),
    });

    // 2. Persist to DB if available
    if (this.prisma?.isConnected && this.prisma.guildMemory) {
      try {
        await this.prisma.guildMemory.upsert({
          where: {
            guildId_key: {
              guildId,
              key: normKey,
            },
          },
          create: {
            guildId,
            key: normKey,
            value: trimmedVal,
            metadata: metadata ?? undefined,
          },
          update: {
            value: trimmedVal,
            metadata: metadata ?? undefined,
          },
        });
      } catch (err) {
        this.logger.warn(
          `[Memory] Failed to persist memory for guild ${guildId} [${normKey}]: ${String(err)}`,
        );
      }
    }
  }

  /** Retrieve a single memory by key, strictly scoped to guildId */
  async get(guildId: string, key: string): Promise<string | null> {
    if (!guildId || !key) return null;
    const normKey = this.normalizeKey(key);

    // Check in-memory first
    const cached = this.memCache.get(guildId)?.get(normKey);
    if (cached) return cached.value;

    // Check DB if connected
    if (this.prisma?.isConnected && this.prisma.guildMemory) {
      try {
        const found = await this.prisma.guildMemory.findUnique({
          where: {
            guildId_key: {
              guildId,
              key: normKey,
            },
          },
        });
        if (found) {
          if (!this.memCache.has(guildId)) {
            this.memCache.set(guildId, new Map());
          }
          this.memCache.get(guildId)!.set(normKey, {
            key: found.key,
            value: found.value,
            metadata: found.metadata,
            updatedAt: found.updatedAt,
          });
          return found.value;
        }
      } catch (err) {
        this.logger.warn(`[Memory] Failed to read from DB: ${String(err)}`);
      }
    }

    return null;
  }

  /** Search memories within a guild by keyword / query string */
  async search(
    guildId: string,
    query: string,
    limit = 6,
  ): Promise<MemoryEntry[]> {
    if (!guildId) return [];
    const normQuery = query.toLowerCase().trim();

    const results: MemoryEntry[] = [];
    const seenKeys = new Set<string>();

    // 1. Check in-memory
    const guildMap = this.memCache.get(guildId);
    if (guildMap) {
      for (const [k, entry] of guildMap.entries()) {
        if (
          !normQuery ||
          k.includes(normQuery) ||
          entry.value.toLowerCase().includes(normQuery)
        ) {
          results.push(entry);
          seenKeys.add(k);
          if (results.length >= limit) return results;
        }
      }
    }

    // 2. Supplement from DB if available and under limit
    if (this.prisma?.isConnected && this.prisma.guildMemory) {
      try {
        const dbItems = await this.prisma.guildMemory.findMany({
          where: {
            guildId,
            OR: normQuery
              ? [
                  { key: { contains: normQuery, mode: 'insensitive' } },
                  { value: { contains: normQuery, mode: 'insensitive' } },
                ]
              : undefined,
          },
          take: limit,
          orderBy: { updatedAt: 'desc' },
        });

        for (const item of dbItems) {
          if (!seenKeys.has(item.key)) {
            const entry: MemoryEntry = {
              key: item.key,
              value: item.value,
              metadata: item.metadata,
              updatedAt: item.updatedAt,
            };
            results.push(entry);
            seenKeys.add(item.key);
            // warm cache
            if (!this.memCache.has(guildId)) {
              this.memCache.set(guildId, new Map());
            }
            this.memCache.get(guildId)!.set(item.key, entry);
            if (results.length >= limit) break;
          }
        }
      } catch (err) {
        this.logger.warn(`[Memory] DB search failed: ${String(err)}`);
      }
    }

    return results;
  }

  /** Extract key terms from text (user IDs, mentions, nicknames, common words) to find matching memories */
  async findRelevantMemories(
    guildId: string,
    text: string,
    userMentions: string[] = [],
    limit = 8,
  ): Promise<MemoryEntry[]> {
    if (!guildId) return [];

    const candidates = new Set<string>();
    for (const uid of userMentions) {
      candidates.add(uid.toLowerCase());
    }

    // Extract potential names / keywords: tokens of length >= 2
    const words = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && w.length <= 30);

    for (const w of words.slice(0, 15)) {
      candidates.add(w);
    }

    const matched: MemoryEntry[] = [];
    const seenKeys = new Set<string>();

    for (const cand of candidates) {
      if (matched.length >= limit) break;
      const found = await this.search(guildId, cand, 2);
      for (const item of found) {
        if (!seenKeys.has(item.key)) {
          seenKeys.add(item.key);
          matched.push(item);
          if (matched.length >= limit) break;
        }
      }
    }

    return matched;
  }

  /** Delete a memory key in a guild */
  async forget(guildId: string, key: string): Promise<boolean> {
    if (!guildId || !key) return false;
    const normKey = this.normalizeKey(key);

    this.memCache.get(guildId)?.delete(normKey);

    if (this.prisma?.isConnected && this.prisma.guildMemory) {
      try {
        await this.prisma.guildMemory.deleteMany({
          where: { guildId, key: normKey },
        });
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * List memories for a guild with pagination, search, and source filter.
   */
  async list(
    guildId: string,
    page = 1,
    pageSize = 20,
    search?: string,
    sourceFilter?: 'all' | 'ai' | 'manual',
  ): Promise<{
    items: MemoryEntry[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    if (!guildId) return { items: [], total: 0, page, pageSize };
    const normSearch = search ? search.trim().toLowerCase() : undefined;

    // 1. If DB is connected, fetch with pagination and count
    if (this.prisma?.isConnected && this.prisma.guildMemory) {
      try {
        const whereClause: any = { guildId };
        if (normSearch) {
          whereClause.OR = [
            { key: { contains: normSearch, mode: 'insensitive' } },
            { value: { contains: normSearch, mode: 'insensitive' } },
          ];
        }

        const allDbItems = await this.prisma.guildMemory.findMany({
          where: whereClause,
          orderBy: { updatedAt: 'desc' },
        });

        let filtered = allDbItems.map((item) => ({
          key: item.key,
          value: item.value,
          metadata: item.metadata,
          updatedAt: item.updatedAt,
        }));

        if (sourceFilter && sourceFilter !== 'all') {
          filtered = filtered.filter((item) => {
            const src = (item.metadata as any)?.source;
            if (sourceFilter === 'ai') return src === 'ai';
            if (sourceFilter === 'manual') return src === 'manual' || !src;
            return true;
          });
        }

        const total = filtered.length;
        const startIndex = Math.max(0, (page - 1) * pageSize);
        const items = filtered.slice(startIndex, startIndex + pageSize);

        // Sync local cache
        if (!this.memCache.has(guildId)) {
          this.memCache.set(guildId, new Map());
        }
        for (const item of items) {
          this.memCache.get(guildId)!.set(item.key, item);
        }

        return { items, total, page, pageSize };
      } catch (err) {
        this.logger.warn(
          `[Memory] DB list failed, falling back to cache: ${String(err)}`,
        );
      }
    }

    // 2. Fallback to memory cache
    const guildMap = this.memCache.get(guildId);
    let allEntries = guildMap ? Array.from(guildMap.values()) : [];
    if (normSearch) {
      allEntries = allEntries.filter(
        (e) =>
          e.key.includes(normSearch) ||
          e.value.toLowerCase().includes(normSearch),
      );
    }
    if (sourceFilter && sourceFilter !== 'all') {
      allEntries = allEntries.filter((item) => {
        const src = item.metadata?.source;
        if (sourceFilter === 'ai') return src === 'ai';
        if (sourceFilter === 'manual') return src === 'manual' || !src;
        return true;
      });
    }
    allEntries.sort(
      (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
    );

    const total = allEntries.length;
    const startIndex = Math.max(0, (page - 1) * pageSize);
    const items = allEntries.slice(startIndex, startIndex + pageSize);

    return { items, total, page, pageSize };
  }

  /**
   * Get memory summary stats for a guild.
   */
  async getStats(
    guildId: string,
  ): Promise<{ total: number; aiCount: number; manualCount: number }> {
    if (!guildId) return { total: 0, aiCount: 0, manualCount: 0 };

    if (this.prisma?.isConnected && this.prisma.guildMemory) {
      try {
        const allItems = await this.prisma.guildMemory.findMany({
          where: { guildId },
          select: { metadata: true },
        });
        let aiCount = 0;
        let manualCount = 0;
        for (const item of allItems) {
          const src = (item.metadata as any)?.source;
          if (src === 'ai') aiCount++;
          else manualCount++;
        }
        return { total: allItems.length, aiCount, manualCount };
      } catch (err) {
        this.logger.warn(`[Memory] DB stats failed: ${String(err)}`);
      }
    }

    const guildMap = this.memCache.get(guildId);
    let aiCount = 0;
    let manualCount = 0;
    if (guildMap) {
      for (const item of guildMap.values()) {
        const src = item.metadata?.source;
        if (src === 'ai') aiCount++;
        else manualCount++;
      }
    }
    return {
      total: guildMap?.size ?? 0,
      aiCount,
      manualCount,
    };
  }
}

// Singleton instance
let _memoryInstance: GuildMemoryService | null = null;
export function getGuildMemoryService(
  prisma?: PrismaService,
): GuildMemoryService {
  if (!_memoryInstance) {
    _memoryInstance = new GuildMemoryService(prisma);
  } else if (prisma) {
    _memoryInstance.setPrisma(prisma);
  }
  return _memoryInstance;
}

/** System prompt for extracting structured memory facts from an admin's free-text instruction. */
export const MEMORY_PROMPT_EXTRACTION_SYSTEM =
  'Bạn là công cụ trích xuất ký ức (memory) cho một Discord bot quản lý server. ' +
  'Admin sẽ nhập một đoạn văn bản mô tả một hoặc nhiều sự thật cần ghi nhớ về thành viên, ' +
  'sự kiện hoặc quy tắc của server. Nhiệm vụ của bạn là trích xuất TỪNG sự thật riêng biệt ' +
  'thành một object gồm:\n' +
  '- "key": từ khóa định danh ngắn gọn để tra cứu (tên/nickname không dấu, ID Discord nếu có, hoặc chủ đề ngắn).\n' +
  '- "value": nội dung đầy đủ, rõ ràng, viết ở ngôi thứ ba, súc tích (dưới 300 ký tự).\n\n' +
  'Nếu admin đề cập nhiều sự thật về nhiều đối tượng khác nhau, tách thành nhiều entries riêng biệt. ' +
  'Nếu nội dung không chứa sự thật cụ thể nào đáng ghi nhớ, trả về mảng entries rỗng.\n\n' +
  'CHỈ trả về một khối JSON hợp lệ duy nhất theo đúng cấu trúc sau, không kèm bất kỳ văn bản nào khác:\n' +
  '{"entries": [{"key": "...", "value": "..."}]}';

/** Parse the LLM's `{"entries": [...]}` response from the memory-extraction prompt. */
export function parseMemoryPromptEntries(
  text: string | null,
): { key: string; value: string }[] {
  if (!text) return [];
  const trimmed = text.trim();

  const tryParse = (raw: string): { key: string; value: string }[] | null => {
    try {
      const data = JSON.parse(raw);
      const entries = Array.isArray(data?.entries) ? data.entries : null;
      if (!entries) return null;
      return entries
        .filter(
          (e: unknown): e is { key: unknown; value: unknown } =>
            typeof e === 'object' && e !== null,
        )
        .map((e) => ({
          key: String(e.key ?? '').trim(),
          value: String(e.value ?? '').trim(),
        }))
        .filter((e) => e.key && e.value);
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  if (direct) return direct;

  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    const fenced = tryParse(jsonMatch[1]);
    if (fenced) return fenced;
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const braced = tryParse(trimmed.slice(firstBrace, lastBrace + 1));
    if (braced) return braced;
  }

  return [];
}
