# FoxyBot — Master Project Description & Architecture Prompt

> **Mục đích**: Tài liệu này đóng vai trò là **Master Prompt** mô tả toàn diện dự án **FoxyBot**. Bạn có thể sao chép toàn bộ nội dung file này để nạp vào bất kỳ mô hình AI nào (Claude, ChatGPT, Gemini, Cursor...) làm bối cảnh hệ thống (System Prompt / Context) hoặc dùng làm tài liệu kiến trúc kỹ thuật chuẩn mực cho lập trình viên.

---

## 🌟 1. Tổng Quan Dự Án (Project Overview)

- **Tên dự án**: **FoxyBot**
- **Loại hình**: Discord Bot đa năng kết hợp Web Dashboard quản trị thời gian thực.
- **Mô hình tổ chức**: Monorepo quản lý bởi **`pnpm workspaces`**.
- **Tác giả / Maintainer**: Konnn04
- **Giấy phép**: MIT License

**FoxyBot** không chỉ là một bot Discord thông thường, mà là một hệ thống dịch vụ hoàn chỉnh phục vụ cộng đồng server Discord với các trụ cột chính:
1. **Trợ lý AI Đa Năng (AI Chatbot & Memory)**: Tích hợp nhiều nhà cung cấp LLM hàng đầu (Google Gemini, DeepSeek, AgentRouter/OpenAI-compatible), hỗ trợ Vision (thị giác máy tính), cơ chế Tool Calling bảo mật có whitelist theo từng server, và hệ thống Ký ức dài hạn (`GuildMemory`) tự động ghi nhớ thông tin thành viên và server.
2. **Hệ Thống Giftcode Đa Tựa Game Tự Động**: Tự động thu thập mã quà tặng từ cả HoYoverse API chính thống (Genshin Impact, Honkai: Star Rail, Zenless Zone Zero,...) lẫn crawler bóc tách web cho các tựa game đình đám khác (Wuthering Waves, Neverness to Everness, Arknights,...), thông báo tự động theo vai trò (Role Tag) với bộ nhớ đệm chống trùng lặp.
3. **Âm Nhạc & Phòng Thoại (Music & Voice Streaming)**: Stream âm thanh chất lượng cao từ YouTube & Spotify qua music server tự host, tìm kiếm lời bài hát đồng bộ (`LRCLIB`), lịch sử phát nhạc, gợi ý bài hát, giọng nói Text-to-Speech (TTS đa ngôn ngữ) và quản trị phòng voice thông minh.
4. **Hệ Thống Cày Cấp & Danh Hiệu (XP & Role Rank)**: Cơ chế đệm bộ nhớ (In-memory Buffer) gom nhóm ghi nhận XP chat/voice và xả vào PostgreSQL theo chu kỳ 30s để tối ưu hiệu năng; tự động trao Role Discord theo mốc Level (Role Rank); sinh thẻ Rank Card và Welcome Card dạng ảnh vẽ Canvas bằng backend `@napi-rs/canvas`.
5. **Web Dashboard Thời Gian Thực (React 19 + Vite 7)**: Bảng điều khiển quản trị trực quan với Discord OAuth2, thiết kế thẻ chào mừng (Welcome Canvas/Embed Builder), cấu hình AI Chatbot & quản trị bộ nhớ Ký ức, bảng thống kê hoạt động server và trình phát nhạc Web tương tác thời gian thực qua WebSocket.
6. **Báo Cáo Buổi Họp & Họp Voice (Meetings Tracking)**: Theo dõi thời gian tham gia, điểm danh và xuất báo cáo web công khai (`/meetings/:id`).
7. **Social & Public Presence API**: API hiện diện công khai tương thích chuẩn Lanyard để hiển thị trạng thái Discord lên Portfolio cá nhân; theo dõi hoạt động thành viên (Stalker tracking kèm cơ chế Opt-out); thông báo bài tập LeetCode hàng ngày và lịch chiếu Anime.

---

## 🛠️ 2. Công Nghệ & Thư Viện Sử Dụng (Tech Stack)

### Backend & Discord Bot (`apps/api`)
- **Framework**: [NestJS 11](https://nestjs.com/) (Node.js v20+, TypeScript Strict Mode)
- **Discord SDK**: [discord.js v14](https://discord.js.org/) & [@discordjs/voice](https://github.com/discordjs/voice)
- **ORM & Cơ sở dữ liệu**: [Prisma ORM 7](https://www.prisma.io/) kết hợp **PostgreSQL** (chạy trên Docker hoặc kết nối trực tiếp)
- **Hàng đợi & Caching**: [BullMQ](https://docs.bullmq.io/) & [ioredis](https://github.com/redis/ioredis)
- **Giao tiếp thời gian thực**: [Socket.IO](https://socket.io/) (`@nestjs/websockets`, `@nestjs/platform-socket.io`)
- **Xử lý đồ họa & Canvas**: [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) (vẽ thẻ Rank và thẻ Welcome Card tốc độ cao bằng native Rust)
- **Xử lý hình ảnh**: [sharp](https://sharp.pixelplumbing.com/) (nén và tối ưu ảnh trước khi gửi vào LLM Vision)
- **Text-to-Speech**: [edge-tts-universal](https://github.com/rany2/edge-tts) (tổng hợp giọng đọc tự nhiên từ Microsoft Edge TTS)
- **Web Scraping & HTTP**: [axios](https://axios-http.com/), [node-html-parser](https://github.com/taoqf/node-html-parser)
- **Logging & Tài liệu API**: [pino](https://getpino.io/), [nestjs-pino](https://github.com/iamolegga/nestjs-pino), [Swagger/OpenAPI](https://swagger.io/) (`@nestjs/swagger`)

### Frontend Web Dashboard (`apps/web`)
- **Core**: [React 19](https://react.dev/), [Vite 7](https://vitejs.dev/), TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/)
- **State Management**: [Zustand 5](https://github.com/pmndrs/zustand) (Client state), [TanStack React Query v5](https://tanstack.com/query) (Server state & Caching)
- **Form & Validation**: [React Hook Form](https://react-hook-form.com/), [Zod 4](https://zod.dev/)
- **Charts & Trực quan hóa**: [Recharts 3](https://recharts.org/)
- **Thời gian thực**: [Socket.IO Client](https://socket.io/docs/v4/client-api/)

### Gói dùng chung (`packages/shared`)
- Nơi lưu trữ **duy nhất** toàn bộ kiểu dữ liệu (Types, Interfaces, DTOs, Enums), schema cài đặt bot (`settings.types.ts`), định nghĩa game (`GIFTCODE_GAMES`), công cụ AI (`CHATBOT_TOOLS`), nhà cung cấp LLM (`LLM_PROVIDERS`), và các hằng số dùng chung giữa API và Web.

---

## 🏛️ 3. Cấu Trúc Thư Mục Monorepo (Repository Layout)

```
discord-bot/
├── apps/
│   ├── api/                              # Backend NestJS & Discord Bot
│   │   ├── prisma/
│   │   │   └── schema.prisma             # Định nghĩa toàn bộ Database Schema PostgreSQL
│   │   └── src/
│   │       ├── main.ts                   # Điểm khởi động NestJS, Swagger, CORS
│   │       └── modules/
│   │           ├── auth/                 # Discord OAuth2 login & JWT Token Service
│   │           ├── discord/              # Trọng tâm Discord Gateway & Bot
│   │           │   ├── actions/          # Presentation-Agnostic Business Logic
│   │           │   │   ├── chat/         # Actions: đọc lịch sử chat, tìm kiếm memory
│   │           │   │   ├── giftcode/     # Actions: lấy giftcode, crawl giftcode
│   │           │   │   ├── guild/        # Actions: thông tin server, danh sách thành viên, đổi nick, di chuyển voice
│   │           │   │   ├── music/        # Actions: play, pause, skip, stop, queue
│   │           │   │   ├── voice/        # Actions: đổi tên kênh thoại, chỉnh bitrate
│   │           │   │   ├── xp/           # Actions: xem rank, xem leaderboard
│   │           │   │   ├── context.ts    # ActionContext definition
│   │           │   │   └── types.ts      # Action & ActionResult interfaces
│   │           │   ├── chatbot/          # AI Chatbot Module
│   │           │   │   ├── llm/          # Provider adapters: Gemini, DeepSeek, AgentRouter
│   │           │   │   ├── prompts/      # System prompt templates (.md)
│   │           │   │   ├── chatbot.service.ts # Lõi điều phối prompt, vision, tool calling
│   │           │   │   ├── llm-client.ts # Giao diện gọi LLM chung
│   │           │   │   ├── memory.service.ts # Quản lý Ký ức server (GuildMemory)
│   │           │   │   ├── message-splitter.ts # Cắt nhỏ tin nhắn tránh vượt quá 2000 ký tự
│   │           │   │   └── tools.ts      # Tool Registry & JSON Schema definitions
│   │           │   ├── commands/         # Discord Slash Commands (13 chuyên mục)
│   │           │   ├── events/           # Discord Gateway Events (ready, message-create, voice-state,...)
│   │           │   └── services/         # CommandLoader, EventLoader, Music, TTS, VoiceTag,...
│   │           ├── giftcode/             # Bộ điều phối gửi thông báo giftcode đến các guild
│   │           ├── giftcode-crawler/     # Crawler bóc tách giftcode cho game ngoài HoYoverse
│   │           ├── guilds/               # REST API quản lý guilds, cài đặt, dashboard stats
│   │           ├── meetings/             # REST API & lưu trữ báo cáo cuộc họp
│   │           ├── michosgc/             # Bộ quét API giftcode HoYoverse định kỳ
│   │           ├── presence/             # REST API hiện diện công khai (Lanyard-compatible)
│   │           ├── prisma/               # PrismaService kết nối PostgreSQL
│   │           ├── settings/             # GuildSettingsService & GlobalSettingsService (Hybrid In-Memory)
│   │           └── xp/                   # XpBufferService (In-memory batching buffer 30s)
│   └── web/                              # Frontend React 19 Dashboard
│       └── src/
│           ├── components/               # UI components, layout, visual builders
│           ├── hooks/                    # useGuild, useAuth, useSocket,...
│           ├── lib/                      # api-client, routes, utils
│           ├── pages/
│           │   ├── admin/                # Dashboard tổng quan, Danh sách thành viên
│           │   │   └── settings/         # Cài đặt Welcome, Chatbot, Memory, Giftcode, RoleRank, Thông báo
│           │   ├── landing/              # Landing page giới thiệu bot
│           │   ├── meeting-report/       # Báo cáo điểm danh voice họp công khai
│           │   ├── music/                # Web Music Player thời gian thực
│           │   └── login.tsx, callback.tsx # Discord OAuth2 Authentication
│           └── routes/                   # React Router 7 setup
├── packages/
│   └── shared/                           # Shared types & schemas
│       └── src/types/
│           ├── settings.types.ts         # Schema toàn diện cấu hình Bot & Guild
│           ├── discord.types.ts          # Type Discord payload & events
│           ├── music.types.ts            # Type bài hát, hàng chờ, socket events
│           └── api.types.ts              # API Response DTOs
├── Dockerfile                            # Dockerfile build production
├── docker-compose.yml                    # Docker Compose môi trường production
└── .env.example                          # Danh mục đầy đủ biến môi trường
```

---

## ⚡ 4. Các Mẫu Thiết Kế Trọng Yếu (Architectural Patterns)

### 1. The Action Pattern (Tách rời nghiệp vụ khỏi giao thức kích hoạt)
- **Vấn đề**: Cùng một nghiệp vụ (ví dụ: phát một bài nhạc, xem thứ hạng, tra giftcode, đổi tên kênh voice) có thể được gọi từ **Slash Command** của Discord, hoặc do **AI Chatbot** tự quyết định gọi qua Function Calling / Tool Calling, hoặc kích hoạt từ **Web Dashboard REST API**.
- **Giải pháp**: Tất cả nghiệp vụ được đóng gói thành các hàm `Action` độc lập trong `apps/api/src/modules/discord/actions/`:
  - Mỗi `Action` nhận vào `ActionContext` (chứa `guild`, `actor`, `client`, `deps`, `voiceChannel`, `textChannelId`).
  - Trả về đối tượng chuẩn hóa `ActionResult<T>`: `{ ok: boolean, message: string, data?: T }`.
  - Slash Commands và Chatbot Tools chỉ đóng vai trò tầng trình diễn (Presentation Layer), trích xuất tham số và chuyển vào `Action`.

### 2. Cài Đặt Hệ Thống Lai (Hybrid In-Memory + PostgreSQL)
- **Vấn đề**: Trong một server Discord sôi động, mỗi tin nhắn chat hay mỗi lượt ra/vào voice đều cần kiểm tra cấu hình guild (prefix, kênh thông báo, bộ lọc, XP tracking, AI enable). Việc truy vấn database liên tục sẽ gây tắc nghẽn I/O.
- **Giải pháp**:
  - Lưu trữ bền vững dưới dạng `JSONB` trong bảng `Guild` và `GlobalSetting` của PostgreSQL.
  - Khi khởi động, `GuildSettingsService` và `GlobalSettingsService` nạp toàn bộ cấu hình vào bộ nhớ đệm `Map<string, GuildSettings>`.
  - Mọi thao tác đọc của Discord Bot đều diễn ra **đồng bộ trong RAM với độ trễ ~0ms**.
  - Khi quản trị viên cập nhật cài đặt qua Web Dashboard hoặc lệnh chat, hệ thống ghi bất đồng bộ vào PostgreSQL và cập nhật ngay lập tức bộ nhớ đệm RAM.

### 3. Bộ Đệm Gom Nhóm XP (XpBufferService Batching)
- **Vấn đề**: Hàng nghìn thành viên chat và voice đồng thời có thể gây quá tải lock database nếu cập nhật điểm kinh nghiệm (XP) trên từng tin nhắn.
- **Giải pháp**:
  - `XpBufferService` tích lũy điểm kinh nghiệm trong bộ nhớ RAM kèm quy tắc giãn cách chống spam (cooldown).
  - Cứ mỗi 30 giây, một tác vụ định kỳ sử dụng Prisma `$transaction` để xả toàn bộ điểm tích lũy vào database trong một phiên ghi duy nhất.
  - Ghi nhận lịch sử thăng hạng theo chu kỳ tháng/năm (`GuildMemberXp`) phục vụ cho bảng xếp hạng linh hoạt.

### 4. Hệ Thống AI Chatbot Đa Nhà Cung Cấp & Bộ Nhớ Ký Ức
- **Lõi LLM Client**: Kiến trúc Adapter cho phép dễ dàng chuyển đổi hoặc ghi đè model/provider theo từng server:
  - **Google Gemini**: Tận dụng khả năng Function Calling xuất sắc và phân tích hình ảnh (Vision).
  - **DeepSeek**: Mô hình suy luận mạnh mẽ qua chuẩn OpenAI chat completions.
  - **AgentRouter / OpenRouter**: Hỗ trợ toàn diện các mô hình mới nhất (GPT-5.6, Claude 3.7, DeepSeek v4,...).
- **Kiểm soát bảo mật Tool Calling**: Mỗi server có danh sách `allowedTools`. Bot chỉ được phép kích hoạt những công cụ mà quản trị viên bật trong Web Dashboard. Các công cụ can thiệp server (đổi tên phòng, đổi biệt danh, di chuyển voice) được gắn cờ rủi ro (`risky: true`).
- **Vision**: Tự động nhận diện file ảnh đính kèm trong tin nhắn chat, nén ảnh qua thư viện `sharp` để tiết kiệm token và gửi trực tiếp tới mô hình thị giác.
- **Cơ chế Ký Ức (`GuildMemory`)**:
  - System prompt yêu cầu mô hình LLM trả về cấu trúc JSON chứa `"remember": [{ "key": string, "value": string }]`.
  - Bot tự động trích xuất các dữ kiện quan trọng về người dùng hoặc server và lưu vào cơ sở dữ liệu.
  - Khi có câu hỏi liên quan, bot tự tra cứu qua công cụ `search_memory` để duy trì ngữ cảnh dài hạn.
  - Quản trị viên có thể xem, tìm kiếm, chỉnh sửa hoặc xóa từng mục ký ức trực tiếp trên Web Dashboard (`/admin/:guildId/settings/memory`).

### 5. Hệ Thống Giftcode Hợp Nhất (Unified Giftcode System)
- Kết hợp cả hai nguồn dữ liệu:
  - **HoYoverse API** (`michosgc`): Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, Honkai Impact 3rd, Tears of Themis.
  - **Scraper Crawler** (`giftcode-crawler`): Bóc tách dữ liệu web định kỳ cho các tựa game Wuthering Waves, Neverness to Everness, Arknights, Endfield, Where Winds Meet.
- **Deduplication**: Bảng `GiftcodeCache` lưu hash của danh sách mã. Chỉ khi xuất hiện mã mới thì thông báo mới được phát đi.
- **Thông báo linh hoạt**: Hỗ trợ 2 chế độ tag role: `common` (tag một role chung cho tất cả game) hoặc `perGame` (tag role riêng biệt tương ứng từng game).

---

## 🗄️ 5. Cơ Sở Dữ Liệu (Database Schema Overview)

Được quản lý thông qua **Prisma ORM** với các thực thể cốt lõi:
- **`Guild`**: Thông tin server, chủ sở hữu, cấu hình JSONB (`settings`).
- **`GlobalSetting`**: Cấu hình toàn cục bot (prefix mặc định, công thức XP, giới hạn,...).
- **`User`**: Dữ liệu tài khoản người dùng, liên kết GitHub, LeetCode, tùy chọn nhận DM.
- **`GuildMember`**: Thông tin thành viên trong server, tổng XP, Level hiện tại, số phút tham gia voice, số buổi họp tham dự.
- **`GuildMemberXp`**: Điểm kinh nghiệm tích lũy theo từng chu kỳ (`period`: ví dụ `2026-09`) phục vụ bảng xếp hạng tháng và all-time.
- **`GuildMemory`**: Bộ nhớ ký ức AI của từng server (`guildId`, `key`, `value`, `metadata`).
- **`GiftcodeCache`**: Lưu cache mã giftcode và hash chống bắn thông báo trùng lặp.
- **`MusicHistory`**: Nhật ký nghe nhạc của thành viên trong từng server (nguồn YouTube/Spotify, thời lượng).
- **`MeetingReport`**: Báo cáo chi tiết các buổi họp voice (danh sách người tham gia, thời gian vào/ra, tổng thời lượng).
- **`VoiceChannelRole`**: Ánh xạ giữa kênh thoại và role tag-everyone tự động sinh ra khi có người vào phòng.
- **`PublicPresence` / `OnlinePresenceLog`**: Thông tin trạng thái online phục vụ API hiển thị Portfolio ngoài web và biểu đồ thống kê online.
- **`StalkerSubscription` / `StalkerOptOut`**: Danh sách đăng ký theo dõi hoạt động (voice, online, game, tin nhắn) và danh sách người dùng từ chối bị theo dõi.
- **`AnimeTrack` / `AnimeEpisodeNotified`**: Danh sách anime theo dõi và lịch thông báo tập mới qua tin nhắn riêng.
- **`ConfessionConfig` / `ConfessionLog`**: Cấu hình kênh nhắn ẩn danh và nhật ký lưu ID tác giả để quản trị viên đối soát khi có hành vi vi phạm.

---

## 💻 6. Hướng Dẫn Phát Triển & Vận Hành (Development Guide)

### Yêu cầu tiên quyết
- **Node.js**: v20.x trở lên
- **pnpm**: v10.x trở lên
- **PostgreSQL**: v14 trở lên (khuyên dùng qua Docker)
- **Discord Bot Token**: Tạo từ Discord Developer Portal (yêu cầu bật đầy đủ Privileged Gateway Intents: Message Content, Server Members, Presence).

### Thiết lập môi trường
1. Sao chép file `.env.example` thành `.env` tại thư mục gốc của monorepo:
   ```bash
   cp .env.example .env
   ```
2. Cập nhật các biến cấu hình cần thiết: `DATABASE_URL`, `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `JWT_SECRET`, các API key AI (`GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`).

### Các lệnh điều hành dự án
```bash
# Cài đặt toàn bộ thư viện trong monorepo
pnpm install

# Khởi tạo Prisma Client và đồng bộ cấu trúc DB
pnpm db:generate
pnpm db:push

# Chạy đồng thời cả API và Web ở chế độ Dev
pnpm dev

# Chạy riêng lẻ từng app
pnpm dev:api   # Chạy backend NestJS & Discord Bot
pnpm dev:web   # Chạy web dashboard Vite

# Build toàn bộ dự án để kiểm tra lỗi biên dịch
pnpm build

# Mở giao diện trực quan Prisma Studio
pnpm db:studio
```

---

## 📌 7. Quy Tắc Ứng Xử Khi Pair Programming / Viết Code
1. **Không trùng lặp Types**: Bất kỳ Type nào dùng chung giữa backend và frontend bắt buộc phải khai báo trong `packages/shared/src/types`.
2. **Tuân thủ Action Pattern**: Mọi logic tương tác server, âm nhạc, dữ liệu Discord phải viết ở dạng `Action` trong `apps/api/src/modules/discord/actions/` để cả Slash Command và Chatbot Tool cùng dùng chung.
3. **Bảo toàn chú thích code**: Tuyệt đối không xóa chú thích, docstring hoặc code mẫu có sẵn của dự án khi không được yêu cầu.
4. **Không chỉnh sửa code nếu người dùng chỉ yêu cầu phân tích/mô tả**: Luôn lắng nghe chính xác chỉ dẫn của người dùng.
