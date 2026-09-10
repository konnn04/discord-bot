import { GuildMemoryService } from './memory.service';

describe('GuildMemoryService', () => {
  let service: GuildMemoryService;

  beforeEach(() => {
    service = new GuildMemoryService();
  });

  it('should isolate memories strictly by guildId', async () => {
    const guildA = 'guild-111';
    const guildB = 'guild-222';

    await service.remember(guildA, 'konnn', 'Konnn là lập trình viên server A');
    await service.remember(guildB, 'konnn', 'Konnn là gamer ở server B');

    const memA = await service.get(guildA, 'konnn');
    const memB = await service.get(guildB, 'konnn');

    expect(memA).toBe('Konnn là lập trình viên server A');
    expect(memB).toBe('Konnn là gamer ở server B');

    // Guild B cannot find guild A's unique memory
    await service.remember(guildA, 'secret_rule', 'Không được spam memes');
    const searchB = await service.search(guildB, 'secret_rule');
    expect(searchB.length).toBe(0);

    const searchA = await service.search(guildA, 'secret_rule');
    expect(searchA.length).toBe(1);
    expect(searchA[0].value).toBe('Không được spam memes');
  });

  it('should normalize keys (lowercase, trimmed)', async () => {
    const guildId = 'guild-333';
    await service.remember(guildId, '  KoNNN  ', 'Chủ server');

    const val = await service.get(guildId, 'konnn');
    expect(val).toBe('Chủ server');
  });

  it('should extract relevant memories by keyword matching', async () => {
    const guildId = 'guild-444';
    await service.remember(guildId, 'konnn', 'Konnn là chủ server');
    await service.remember(guildId, 'genshin', 'Server thường xuyên chơi Genshin lúc 8h tối');

    const relevant = await service.findRelevantMemories(
      guildId,
      'Ai là konnn vậy mọi người?',
      [],
    );

    expect(relevant.some((m) => m.key === 'konnn')).toBe(true);
  });

  it('should support forgetting memories', async () => {
    const guildId = 'guild-555';
    await service.remember(guildId, 'temp', 'Thông tin tạm thời');
    expect(await service.get(guildId, 'temp')).toBe('Thông tin tạm thời');

    await service.forget(guildId, 'temp');
    expect(await service.get(guildId, 'temp')).toBeNull();
  });
});
