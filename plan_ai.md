# FoxyBot - Discord bot AI Chatbot Plan (DeepSeek Agentic)

## Feasibility Verdict: ✅ FULLY DOABLE

All three components are achievable with current infrastructure. No new services needed — everything runs on existing PostgreSQL + NestJS stack.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Discord Event                       │
│              messageCreate (non-bot, not cmd)          │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│              ChatbotService                           │
│  - Per-channel ring buffer (in-memory, 50 msgs)       │
│  - User identity tagging (@user, roles)               │
│  - Tool registry (Function Calling schema)            │
│  - Short-term → Long-term memory pipeline             │
└──────────┬───────────────────┬───────────────────────┘
           │                   │
           ▼                   ▼
┌──────────────────┐  ┌──────────────────────────────┐
│  DeepSeek API     │  │  Function Calling Tools       │
│  chat/completions │  │  get_leetcode_daily()         │
│  model: deepseek  │  │  get_anime_season()           │
│  + tools          │  │  search_music(query)          │
│                   │  │  get_weather(city)            │
│                   │  │  get_user_profile(id)         │
└──────────────────┘  └──────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│           Long-term Memory (Nightly)                  │
│  1. Collect today's chat logs per guild               │
│  2. LLM generates summary (50-200 words)              │
│  3. Embedding via deepseek-embed / text-embedding-3   │
│  4. Store in pgvector table (auto-enabled on PG16)    │
│  5. On query: RAG top-K relevant summaries            │
└──────────────────────────────────────────────────────┘
```

---

## 2. Short-term Memory (Per-channel Ring Buffer)

### What we need
- 20-50 recent messages per channel
- Include: username, display name, roles, message content, timestamp
- Drop oldest when exceeding limit
- Reset on bot restart (acceptable — it's "short-term")

### Implementation
```ts
// services/chatbot/chat-memory.service.ts
@Injectable()
export class ChatMemoryService {
  private buffers = new Map<string, ChatMessage[]>();
  readonly maxMessages = 50;

  push(channelId: string, msg: ChatMessage): void {
    const buf = this.buffers.get(channelId) || [];
    buf.push(msg);
    if (buf.length > this.maxMessages) buf.shift();
    this.buffers.set(channelId, buf);
  }

  getContext(channelId: string): ChatMessage[] {
    return this.buffers.get(channelId) || [];
  }
}
```

### Why in-memory (not Redis)
- 50 messages × ~500 chars = 25KB per channel
- 100 active channels = 2.5MB total — trivial
- Restart wipe is acceptable (short-term memory)

---

## 3. Function Calling (Tools)

### How it works
DeepSeek API supports OpenAI-compatible `tools` parameter. We define a registry of available functions, their JSON Schema, and their handlers. When the user asks something actionable, DeepSeek returns a `tool_calls` response; we execute the handler, feed the result back, and DeepSeek crafts the final answer.

### Tool Definition Pattern
```ts
interface ChatTool {
  name: string;
  description: string;
  parameters: JSONSchema;
  handler: (args: Record<string, any>, ctx: ToolContext) => Promise<string>;
}
```

### Proposed Initial Tools

| Tool | Trigger example | Handler |
|------|----------------|---------|
| `get_leetcode_daily` | "Bài LeetCode hôm nay là gì?" | Calls `LeetCodeApiClient.getDaily()` |
| `get_leetcode_random` | "Cho mình 1 bài Medium về DP đi" | Calls `/random?difficulty=medium&tags=dp` |
| `get_leetcode_profile` | "Thằng konnn04 làm được bao nhiêu bài rồi?" | Calls `/user/{username}` |
| `get_anime_season` | "Mùa này có anime gì hot?" | Calls AniList API |
| `search_music` | "Play nhạc gì đó của Sơn Tùng đi" | Calls music search + enqueue |
| `get_weather` | "Hà Nội hôm nay nắng không?" | Calls Open-Meteo (free, no API key) |
| `get_server_info` | "Server này có bao nhiêu người?" | Reads from `client.guilds.cache` |
| `get_user_profile` | "Tôi level bao nhiêu rồi?" | Reads from XP service + DB |

### Adding new tools
```ts
// services/chatbot/tools/get-leetcode-daily.tool.ts
export const getLeetcodeDailyTool: ChatTool = {
  name: 'get_leetcode_daily',
  description: 'Lấy bài LeetCode Daily hôm nay (độ khó, link, topics)',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async (_args, ctx) => {
    const api = getLeetcodeApi();
    const daily = await api.getDaily();
    return JSON.stringify(daily);
  },
};
```

---

## 4. Long-term Memory (Nightly Summarization + RAG)

### Phase 1: Nightly Summarization
- Cron at 2AM UTC (9AM VN)
- Per guild: collect all messages from past 24h (from Discord `messageCreate` log, or fetch via Discord API if bot was offline)
- Send to DeepSeek: "Summarize these chat messages. Focus on: topics discussed, decisions made, jokes/memes, events. 50-200 words."
- Result: a `ChatSummary(text, guildId, date, embedding_vector)` row

### Phase 2: Vector Search (RAG)
- When a user asks a contextual question ("Hôm qua mọi người bàn vụ deploy là sao ý nhỉ?"), we:
  1. Run the user's question through the same embedding model
  2. `SELECT * FROM chat_summaries WHERE guild_id = $1 ORDER BY embedding <=> $2 LIMIT 5` (pgvector cosine distance)
  3. Prepend retrieved summaries to the chat context: `"Memories from previous days:\n- ..."`
  4. Send to DeepSeek with the augmented context

### pgvector Setup
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chat_summaries (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary TEXT NOT NULL,
  embedding VECTOR(1536),  -- or 1024 for deepseek-embed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON chat_summaries USING ivfflat (embedding vector_cosine_ops);
```

### Embedding Model Options
| Model | Dims | Cost | Note |
|-------|------|------|------|
| `deepseek-chat` (same model) | N/A | Free in chat | Can ask it to return embedding as JSON, but not native |
| `text-embedding-3-small` (OpenAI) | 1536 | $0.02/1M tokens | Very cheap, reliable, we already have HTTP fetch |
| `bge-small-zh-v1.5` (local) | 512 | Free | Run via llama.cpp or Transformers.js, but adds infra |

**Recommendation**: Use OpenAI `text-embedding-3-small` for simplicity — it's $0.02 per million tokens, meaning ~$0.0001/day for a busy server.

---

## 5. Library Dependencies

### Already have
| Library | Purpose |
|---------|---------|
| `discord.js` | Message events, user info |
| `@nestjs/schedule` | Cron jobs |
| `axios` | HTTP calls to DeepSeek API |
| PostgreSQL | Storage (with pgvector extension) |

### Need to add (npm install)
| Package | Purpose |
|---------|---------|
| `openai` | DeepSeek API client (OpenAI-compatible) |
| `pgvector` (pg npm extension) | Enabling vector extension in Prisma migration |

### pgvector on PostgreSQL 16
PostgreSQL 16 already ships with pgvector in most distributions. Enable via:
```sql
CREATE EXTENSION vector;
```
No additional Docker image needed — just a migration.

---

## 6. Cost Analysis

### DeepSeek API Pricing
| Item | Price |
|------|-------|
| Input | $0.14 / 1M tokens |
| Output | $0.28 / 1M tokens |

### Estimated daily cost (moderate usage)
| Activity | Tokens in | Tokens out | Cost |
|----------|-----------|------------|------|
| 500 chatbot replies/day | 500 × 200 = 100K | 500 × 150 = 75K | $0.035 |
| Nightly summaries (100 guilds) | 100 × 500 = 50K | 100 × 100 = 10K | $0.010 |
| Embeddings (100 summaries) | — | OpenAI: ~$0.0001 | ~$0.0001 |
| **Total/day** | | | **~$0.045** |
| **Total/month** | | | **~$1.35** |

---

## 7. Event Flow Details

### messageCreate → Chatbot Response
```
1. messageCreate fires
2. Skip if: author is bot, message starts with prefix (f!), is slash command
3. ChatbotService.shouldRespond(message):
   - Bot is @mentioned? → respond
   - Message matches "Bot ơi", "Foxy", etc.? → respond
   - Random reply (configurable % chance, default 0%) → respond
   - Otherwise → just add to memory buffer, don't respond
4. Add message to ChatMemoryService
5. Build context:
   - System prompt (personality, rules)
   - Long-term memory snippets (from pgvector, if relevant)
   - Short-term memory (last 20-50 messages)
   - Current user message
6. Call DeepSeek API with tools
7. If response has tool_calls:
   - Execute tool handlers
   - Feed results back to DeepSeek
   - Get final response
8. Send reply to channel
9. Add bot reply to memory buffer
```

### Nightly Summarization
```
1. Cron fires at 2AM UTC
2. For each guild with chatbot enabled:
   a. Get all messages from ChatMemoryService (last 24h)
   b. If empty, skip
   c. Call DeepSeek: summarize
   d. Call OpenAI: embed summary text
   e. INSERT into chat_summaries
3. Clear memory buffers (optional, or keep as short-term)
```

---

## 8. What CANNOT be done (or not worth it)

| Limitation | Why |
|------------|-----|
| **True "memory" of specific facts** | LLMs don't have real memory. RAG approximates it. Don't expect "Bot, remember my birthday is May 5" to persist perfectly. |
| **Voice chat integration** | DeepSeek doesn't have real-time audio. Could pipe TTS output, but latency 1-3s makes conversation awkward. |
| **Image understanding** | DeepSeek vision API exists but costs more. Discord image attachments would need to be proxied. Can add later. |
| **Character consistency** | Without fine-tuning, the bot's personality may drift. System prompt helps but isn't perfect. |
| **Vietnamese quality** | DeepSeek supports Vietnamese natively — this is actually a strength. Quality is competitive with GPT-4 level. |

---

## 9. Implementation Milestones

### Milestone A: Core Chatbot (3-4 hours)
- [ ] `ChatbotService` + `ChatMemoryService`
- [ ] DeepSeek API client (base URL: `https://api.deepseek.com/v1`, OpenAI-compatible)
- [ ] `messageCreate` event hook
- [ ] Basic system prompt
- [ ] @mention trigger
- [ ] `setting_chatbot` toggle command (per guild, admin-only)

### Milestone B: Function Calling (2-3 hours)
- [ ] Tool registry pattern
- [ ] `get_leetcode_daily`, `get_server_info`, `get_user_profile`
- [ ] Tool execution loop (handle `tool_calls` → execute → feed back → final response)
- [ ] Error handling for tool failures (don't crash the whole response)

### Milestone C: Long-term Memory (3-4 hours)
- [ ] pgvector migration + enable extension
- [ ] `ChatSummary` Prisma model
- [ ] Nightly cron: summarize per guild
- [ ] Embedding pipeline (OpenAI `text-embedding-3-small`)
- [ ] RAG retrieval: `match_summaries(embedding, top_k=5)`
- [ ] Integrate retrieved summaries into chat context

### Milestone D: Polish (1-2 hours)
- [ ] Per-channel personality customization (`setting_chatbot_persona`)
- [ ] Cooldown (avoid spam, 5s between responses per channel)
- [ ] Rate limit handling (DeepSeek: 60 RPM free tier, queue if needed)
- [ ] `my_setting_chatbot` — opt-out / opt-in for DM chatbot

---

## 10. System Prompt Template

```
You are Foxy, a friendly Vietnamese Discord bot.
Current server: {guildName} ({memberCount} members)
Current channel: #{channelName}
Current user: @{username}

Rules:
- Respond naturally in Vietnamese (or English if the user speaks English).
- Keep replies concise — 1-3 sentences unless asked for detail.
- Use Discord markdown: **bold**, *italic*, `code`, ```blocks```, <@user_id> for mentions.
- If you don't know something, say so honestly. Don't make things up.
- You have access to tools to fetch real-time data. Use them when appropriate.
- Be helpful but playful. You're a fox 🦊, not a corporate AI.

Context from previous conversations:
{retrieved_summaries}
```

---

## Decision: Go/No-Go

| Factor | Verdict |
|--------|---------|
| Technical feasibility | ✅ All parts doable with existing stack |
| No new infra needed | ✅ PostgreSQL+pgvector covers everything |
| Library availability | ✅ `openai` npm package, pgvector on PG16 |
| Cost | ✅ ~$1.50/month for moderate use |
| Vietnamese quality | ✅ DeepSeek trained on multilingual data |
| Maintenance burden | ⚠️ New bugs possible, but isolated to 3-4 new files |
| **OVERALL** | **✅ PROCEED** |
