# FoxyBot Feature Plan

## Legend
- `[G]` = Guild setting (`/setting_xxx`) — 1 channel per guild, admin-only
- `[U]` = User setting (`/my_xxx`) — DM or ephemeral, anyone
- `[C]` = Cronjob / scheduled task
- `[D]` = Needs DB persistence

---

## Milestone 1: LeetCode Suite

### 1.1 Daily LeetCode `[G]` `[U]` `[C]`
| Task | Detail |
|------|--------|
| **API client** | `services/leetcode-api.client.ts` — singleton wrapping `https://leetcode-api-pied.vercel.app` |
| **Command: `/setting_dailyleetcode`** | `commands/settings/setting_dailyleetcode.command.ts` — toggle + channel picker (1/guild). Saves to `GuildSettings.features.dailyLeetCode` + `dailyLeetCode.channelId`. |
| **Command: `/my_setting_dailyleetcode`** | `commands/presence/my_dailyleetcode.command.ts` — toggle for DM delivery. Saves to `User.leetcodeDailyDm` (new boolean column). |
| **Cron: 8AM UTC+7** | `services/leetcode-scheduler.service.ts` — `@Cron('0 1 * * *')` (UTC). Fetches `/daily`, sends embed to enabled channels + DMs. |
| **Prisma** | Add `GuildSettings.features.dailyLeetCode`, `GuildSettings.dailyLeetCode.channelId`. Add `User.leetcodeDailyDm`. Add `GiftcodeCache`-style table for daily sent dates to avoid duplicate sends: `LeetcodeDailySent(guildId, date)` + `LeetcodeDailySentUser(userId, date)`. |

**Embed design**: Title=problem name, fields=Difficulty/Acceptance Rate/Topics, link button to `https://leetcode.com{link}`, color by difficulty.

---

### 1.2 Random LeetCode `[U]`
| Task | Detail |
|------|--------|
| **Command: `/random_leetcode`** | `commands/leetcode/random_leetcode.command.ts` — optional args `difficulty` (choices: Easy/Medium/Hard) + `tag`. Fetches `/random?difficulty=...&tags=...`, sends embed with link button. No DB. |

---

### 1.3 My LeetCode Profile `[U]` `[D]`
| Task | Detail |
|------|--------|
| **Prisma** | `User.leetcodeUsername` (String?, nullable), `User.leetcodeShowPresence` (Boolean, default false). Reuse existing User table (like `githubUsername`). |
| **Command: `/my_leetcode`** | `commands/presence/my_leetcode.command.ts` — args: `username` (set), `clear` (bool), `show_on_presence` (bool). Validates via API `/user/{username}`, saves to DB. Embed with avatar, ranking, solve counts by difficulty. Model after `my_github.command.ts`. |
| **Presence API** | Existing `presence` module already supports `githubUsername`/`githubShowPresence`. Add `leetcodeUsername`/`leetcodeShowPresence` fields to `PublicPresence` model and controller response. |

---

### 1.4 LeetCode Contest Notifications `[G]` `[U]` `[C]` `[D]`
| Task | Detail |
|------|--------|
| **Command: `/setting_leetcodecontest`** | Guild toggle + channel picker. Saves to `GuildSettings.features.leetcodeContest` + `leetcodeContest.channelId`. |
| **Command: `/my_setting_leetcodecontest`** | User toggle for DM. Saves to `User.leetcodeContestDm`. |
| **Prisma** | `LeetcodeContestSent` table — `slug String @id`, `guildId String?`, `userId String?`, `notifiedAt DateTime`. Prevents double-send. |
| **Cron: 5PM UTC+7** | `@Cron('0 10 * * *')` (UTC). Fetches `/contests`, filters by `topTwoContests`, checks not in `LeetcodeContestSent`, sends embed with `<t:TIMESTAMP:F>` countdown. Saves sent slugs. |

---

## Milestone 2: Anime Seasonal Tracker `[U]` `[D]`

| Task | Detail |
|------|--------|
| **API client** | `services/anime-api.client.ts` — wraps AniList GraphQL or Jikan REST. Prefer AniList (single endpoint, richer data, rate-limited to 90/min). |
| **Prisma** | `AnimeTrack(userId, animeId, title, posterUrl, nextEpisode, addedAt)` + `AnimeEpisodeNotified(userId, animeId, episode)` — prevents double DM. |
| **Command: `/anime list`** | `commands/anime/anime_list.command.ts` — fetches current season top 25, sends `StringSelectMenu`. On select: save to DB, confirm embed. |
| **Command: `/my_anime`** | `commands/anime/my_anime.command.ts` — list tracked anime with [Unfollow] buttons. |
| **Cron: every 30min** | `services/anime-scheduler.service.ts` — checks AniList broadcast schedule, if new episode aired since last check → DM user with embed + countdown to next episode. |

---

## Milestone 3: Stalker `[U]` `[D]`

| Task | Detail |
|------|--------|
| **Prisma** | `StalkerSubscription(trackerId, targetId, guildId, onOnline, onVoice, onGame)` + `StalkerOptOut(userId)`. |
| **Command: `/stalk [user]`** | `commands/stalk/stalk.command.ts` — opens Modal with checkboxes: Online, Voice, Game. Saves to DB. Must check opt-out list first. |
| **Command: `/stalk_optout`** | `commands/stalk/optout.command.ts` — toggles self in opt-out list. |
| **Command: `/my_stalk`** | List current subscriptions, with [Remove] buttons. |
| **Event: `presenceUpdate`** | `events/presence-update.event.ts` (new). Filter: only `ActivityType.Playing`. Check subscriptions → send DM/notification channel: "🎯 **@target** vừa vào chơi **GAME NAME**!" |
| **Event: `voiceStateUpdate`** | Add stalker check in existing event — if target joins voice → notify subscriber. |
| **Event: `guildMemberUpdate`** | Add presence change detection — if target comes online → notify. |

---

## Milestone 4: Confession `[G]` `[D]`

| Task | Detail |
|------|--------|
| **Prisma** | `ConfessionConfig(guildId, channelId, enabled)`. `ConfessionLog(id, guildId, authorId, content, postedAt)` — **encrypted** or only accessible by admin. |
| **Command: `/config_confession [channel]`** | Admin-only. Sets channel + enables. Saves to DB. |
| **Command: `/confess`** | `commands/confession/confess.command.ts` — opens Modal. On submit: word filter, post to configured channel as "Ẩn danh #XXXX", auto-add ❤️ 😂 😮 😢 🔥 reactions. Log to DB with authorId (encrypted). |
| **Command: `/confession_logs`** | Admin-only. Paginated embed of recent confessions with authorId revealed. |
| **Word filter** | Simple blacklist array in code or config. Expandable to regex. |

---

## Shared patterns

### API client pattern
```ts
// services/<name>.api.client.ts
export class XxxApiClient {
  private baseUrl = 'https://api.example.com';
  async fetch<T>(path: string): Promise<T> { ... }
}
let _instance: XxxApiClient | null = null;
export function getXxxApi(): XxxApiClient { ... }
```

### Cronjob pattern (per MichosgcService)
```ts
@Injectable()
export class XxxScheduler {
  @Cron(CronExpression.EVERY_HOUR) // or custom
  async handleCron() { ... }
}
```

### Settings command pattern (per setting_voicetag)
```
/setting_xxx state:bool [channel:Channel] → admin-only
/my_setting_xxx state:bool → DM the user
```

### Presence pattern (per my_github)
```
/my_xxx <username> [clear] [show_on_presence]
→ validate via API → save to User table → confirm embed
```

---

## Dependency order

```
1. leetcode-api.client.ts          (shared dep)
2. Prisma migration #1              (LeetCode fields + tables)
3. setting_dailyleetcode.command    (dep: 1,2)
4. my_setting_dailyleetcode.command (dep: 1,2)
5. leetcode-scheduler.service      (dep: 1,2)
6. random_leetcode.command          (dep: 1)
7. my_leetcode.command              (dep: 1,2)
8. setting_leetcodecontest.command  (dep: 1,2)
9. my_setting_leetcodecontest.cmd   (dep: 1,2)
10. Prisma migration #2             (Anime/Stalker/Confession)
11. anime-api.client.ts
12. anime commands + scheduler
13. stalker commands + events
14. confession commands
```

---

## Notes
- **No Redis/BullMQ needed** — LeetCode/Anime cron is lightweight (1 API call each). Notifications send sequentially.
- **All URL commands** must validate hostname = `leetcode.com` or show a clear button linking to the problem.
- **Time zone**: All cron use UTC; VN is UTC+7. 8AM VN = 1:00 UTC, 5PM VN = 10:00 UTC.
- **Embed colors**: Easy=green, Medium=orange, Hard=red. Anime=purple, Confession=blurple.
