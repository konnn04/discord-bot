# FoxyBot — Discord Bot & Web Dashboard Quản Trị

<div align="center">
  <p><strong>Bot Discord đa năng, hiện đại kết hợp Web Dashboard thời gian thực, xây dựng với NestJS, React 19, Vite và Prisma (PostgreSQL).</strong></p>
  <p>
    <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/NestJS-11.x-E0234E?logo=nestjs&logoColor=white" alt="NestJS" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black" alt="React" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-v4.x-38B2AC?logo=tailwind-css&logoColor=white" alt="TailwindCSS" /></a>
    <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-7.x-2D3748?logo=prisma&logoColor=white" alt="Prisma" /></a>
    <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/discord.js-14.x-5865F2?logo=discord&logoColor=white" alt="Discord.js" /></a>
    <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" /></a>
  </p>
  <p>
    <a href="README.md"><strong>English</strong></a> •
    <a href="README.vi.md"><strong>Tiếng Việt</strong></a> •
    <a href="PROJECT_PROMPT.md"><strong>Project Prompt</strong></a> •
    <a href="CLAUDE.md"><strong>Hướng Dẫn Kiến Trúc</strong></a>
  </p>
</div>

---

## 📖 Giới Thiệu Tổng Quan

**FoxyBot** là một hệ sinh thái Discord bot toàn diện được tổ chức theo mô hình **pnpm monorepo**. Dự án kết hợp giữa backend hiệu năng cao sử dụng **NestJS 11** và giao diện quản trị hiện đại, mượt mà bằng **React 19 + Vite 7**.

Kiến trúc bot được thiết kế theo mô hình **Action Pattern** (tách biệt hoàn toàn tầng logic nghiệp vụ khỏi tầng kích hoạt). Nhờ đó, một hành động (như phát nhạc, đổi tên kênh voice, tra cứu giftcode, tìm kiếm ký ức) có thể được gọi linh hoạt từ **Slash Command Discord**, **AI Chatbot Function Calling**, hoặc **REST API của Web Dashboard**.

---

## ✨ Tính Năng Nổi Bật

### 🤖 1. Trợ Lý AI Chatbot, Thị Giác Máy Tính & Bộ Nhớ Ký Ức
- **Hỗ trợ đa nền tảng LLM**: Tích hợp sẵn **Google Gemini**, **DeepSeek**, và **AgentRouter / OpenRouter** (hỗ trợ OpenAI-compatible API với các mô hình tiên tiến như GPT-5.6, Claude 3.7, DeepSeek v4).
- **Gọi công cụ an toàn (Tool Calling)**: Phân quyền công cụ theo từng server (`allowedTools`). Bot có thể tự động phát nhạc, đọc lịch sử chat, tra cứu thông tin server, tra giftcode, di chuyển thành viên phòng voice... chỉ khi được quản trị viên cấp phép.
- **Thị giác máy tính (Vision)**: Tự động phát hiện ảnh đính kèm trong tin nhắn, nén tối ưu qua thư viện `sharp` trước khi gửi tới mô hình AI để tiết kiệm token và tăng tốc xử lý.
- **Bộ nhớ Ký ức server (`GuildMemory`)**: Trong quá trình trò chuyện, AI tự động trích xuất các dữ kiện quan trọng về người dùng/server và lưu vào PostgreSQL. Bot có thể tự tra cứu lại thông qua công cụ `search_memory` hoặc cho phép admin quản lý qua Web Dashboard.
- **Tùy biến System Prompt**: Cấu trúc các file Markdown trong `prompts/*.md` được tự động nạp và ghép nối linh hoạt lúc khởi động.

### 🎁 2. Hệ Thống Giftcode Đa Tựa Game Tự Động
- **Cơ chế thu thập kép**:
  - **HoYoverse API** (`michosgc`): Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, Honkai Impact 3rd, Tears of Themis.
  - **Web Scraper Crawler** (`giftcode-crawler`): Bóc tách dữ liệu web tự động cho Wuthering Waves, Neverness to Everness (NTE), Arknights, Endfield, Where Winds Meet.
- **Thông báo thông minh**: Tùy chỉnh nhận thông báo theo từng server với 2 chế độ: tag 1 role chung (`common`) hoặc tag role riêng cho từng game (`perGame`).
- **Chống trùng lặp**: Bảng đệm hash (`GiftcodeCache`) đảm bảo không bao giờ bắn trùng mã cũ sau khi bot khởi động lại.

### 🎵 3. Âm Nhạc Chất Lượng Cao & Phòng Thoại
- **Phát nhạc đa nền tảng**: Tìm kiếm và phát trực tiếp từ YouTube & Spotify thông qua music server tự host.
- **Điều khiển toàn diện**: Phát, tạm dừng, tiếp tục, bỏ qua bài, xem danh sách chờ, lặp bài, xáo trộn, chỉnh âm lượng và xóa bài khỏi hàng đợi.
- **Lời bài hát đồng bộ & Gợi ý nhạc**: Tìm lời bài hát thời gian thực qua [LRCLIB](https://lrclib.net/) và đề xuất nhạc dựa trên lịch sử nghe của người dùng.
- **Giọng đọc Text-to-Speech (TTS)**: Phát giọng nói tiếng Việt và đa ngôn ngữ tự nhiên trong kênh đàm thoại bằng `edge-tts-universal`.
- **Trình phát nhạc Web trực quan**: Giao diện Web Player thời gian thực trên Dashboard, đồng bộ 2 chiều với Discord qua **Socket.IO**.

### 📊 4. Hệ Thống Cày Cấp (XP) & Role Rank Tự Động
- **Bộ đệm gom nhóm RAM (`XpBufferService`)**: Gom điểm XP chat/voice vào bộ nhớ đệm và sử dụng Prisma `$transaction` xả vào PostgreSQL mỗi 30 giây, giúp bot chịu tải mượt mà khi hàng ngàn người chat đồng thời.
- **Role Rank**: Tự động cấp Role Discord không cộng dồn khi thành viên vượt qua các mốc Level cài đặt trước.
- **Thẻ Canvas chuyên nghiệp**: Tạo ảnh thẻ Rank Card và thẻ Chào mừng (Welcome Card) tuyệt đẹp ngay trên backend bằng `@napi-rs/canvas`.

### 🖥️ 5. Web Dashboard Thời Gian Thực (`apps/web`)
- Xây dựng với **React 19**, **Vite 7**, **Tailwind CSS v4**, và **shadcn/ui**.
- **Đăng nhập Discord OAuth2**: Quản lý phiên an toàn với JWT.
- **Tổng quan Server & Danh sách thành viên**: Biểu đồ thống kê số người online theo thời gian thực, quản trị danh sách thành viên.
- **Studio Cài Đặt Trực Quan**:
  - **Welcome & Leave Designer**: Xem trước trực tiếp thẻ Canvas, cấu hình biến thế chỗ văn bản, công cụ tạo Embed.
  - **Chatbot & Tool Studio**: Chọn nhà cung cấp LLM, điền API key riêng, chỉnh model và bật/tắt quyền từng công cụ.
  - **Quản trị Bộ nhớ Ký ức (Memory)**: Tra cứu, xem chi tiết, chỉnh sửa hoặc xóa các sự kiện mà AI đã ghi nhớ.
  - **Cấu hình Giftcode**: Chọn nhận code tựa game nào và gán role ping tương ứng.
  - **Role Rank Editor**: Thêm và chỉnh sửa quy tắc mốc Level tương ứng Role dễ dàng.

### 📅 6. Điểm Danh Buổi Họp & Báo Cáo Công Khai
- Ghi nhận thời gian ra/vào voice của từng thành viên trong buổi họp.
- Tạo đường dẫn báo cáo web công khai đẹp mắt tại `/meetings/:id`.

### 🌐 7. Social, Hiện Diện & Tiện Ích Lập Trình Viên
- **Public Presence API**: API chuẩn tương thích Lanyard giúp bạn nhúng trạng thái Discord, bài hát Spotify đang nghe lên Portfolio cá nhân.
- **Theo dõi hoạt động (Stalker)**: Đăng ký nhận thông báo khi bạn bè online, vào voice, chơi game (kèm lệnh `/optout` bảo vệ quyền riêng tư).
- **LeetCode & Lịch chiếu Anime**: Tự động thông báo câu hỏi LeetCode hàng ngày, lịch thi đấu contest và thông báo tập anime mới qua tin nhắn riêng (DM).
- **Lời thú tội ẩn danh (Confession)**: Nhắn tin ẩn danh vào kênh chung kèm nhật ký đối soát cho quản trị viên ngăn chặn hành vi quấy rối.

---

## 📁 Cấu Trúc Thư Mục Monorepo

```
discord-bot/
├── apps/
│   ├── api/                      # Backend NestJS 11 & Discord bot
│   │   ├── prisma/               # Schema PostgreSQL & Prisma client
│   │   └── src/
│   │       ├── main.ts           # Khởi động ứng dụng & tài liệu Swagger
│   │       └── modules/
│   │           ├── auth/         # Xác thực Discord OAuth2 & JWT
│   │           ├── discord/      # Trọng tâm bot: actions, chatbot, commands, events, music
│   │           ├── giftcode/     # Dịch vụ thông báo giftcode tập trung
│   │           ├── giftcode-crawler/ # Crawler cào giftcode cho game ngoài HoYoverse
│   │           ├── guilds/       # REST API quản lý server & cài đặt
│   │           ├── meetings/     # Theo dõi buổi họp voice & xuất báo cáo
│   │           ├── michosgc/     # Bộ quét API giftcode HoYoverse định kỳ
│   │           ├── presence/     # Public Presence API hiển thị lên portfolio
│   │           ├── prisma/       # Prisma database service
│   │           ├── settings/     # Hệ thống cài đặt bộ nhớ đệm In-Memory
│   │           └── xp/           # Buffer gom nhóm XP & tính toán bảng xếp hạng
│   └── web/                      # Giao diện Web Dashboard React 19 + Vite 7
│       └── src/
│           ├── components/       # shadcn/ui components & layout
│           ├── hooks/            # Hooks tải dữ liệu & kết nối socket
│           ├── pages/            # Trang quản trị, cài đặt, web music, báo cáo
│           └── routes/           # Định nghĩa router React Router 7
├── packages/
│   └── shared/                   # Kiểu dữ liệu, schema cài đặt và hằng số dùng chung
│       └── src/types/            # settings.types.ts, discord.types.ts, music.types.ts
├── Dockerfile                    # File build container Docker production
├── docker-compose.yml            # Khởi chạy toàn bộ hệ thống (API, Web, Postgres, Redis)
└── .env.example                  # File mẫu biến môi trường
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu cầu hệ thống
- **Node.js**: `v20.0.0` trở lên
- **pnpm**: `v10.0.0` trở lên
- **PostgreSQL**: `v14` trở lên
- **Discord Bot Token**: Tạo ứng dụng tại [Discord Developer Portal](https://discord.com/developers/applications) và bật đủ 3 Privileged Gateway Intents (Message Content, Server Members, Presence).

### 1. Clone mã nguồn và cài đặt dependencies
```bash
git clone https://github.com/yourusername/discord-bot.git
cd discord-bot
pnpm install
```

### 2. Thiết lập biến môi trường
Sao chép `.env.example` thành `.env` tại thư mục gốc:
```bash
cp .env.example .env
```
Điền các giá trị quan trọng:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/discord_bot?schema=public"
DISCORD_TOKEN="your_discord_bot_token"
DISCORD_CLIENT_ID="your_discord_client_id"
DISCORD_CLIENT_SECRET="your_discord_client_secret"
JWT_SECRET="your_random_jwt_secret"
GEMINI_API_KEY="your_gemini_api_key"
```

### 3. Đồng bộ cơ sở dữ liệu
```bash
pnpm db:generate
pnpm db:push
```

### 4. Khởi chạy ứng dụng
```bash
# Chạy đồng thời cả API và Web Dashboard ở chế độ dev
pnpm dev

# Hoặc khởi chạy riêng lẻ:
pnpm dev:api   # Chạy NestJS API & Discord Bot tại http://localhost:3000
pnpm dev:web   # Chạy Web Dashboard tại http://localhost:5173
```

- **Tài liệu Swagger API**: Truy cập tại `http://localhost:3000/api/docs`
- **Web Dashboard**: Truy cập tại `http://localhost:5173`

---

## 🐳 Triển Khai Với Docker

Khởi chạy trọn bộ dịch vụ (Backend, Frontend, PostgreSQL, Redis) với một câu lệnh:
```bash
docker-compose up -d --build
```

---

## 🎮 Tổng Hợp Lệnh Slash Commands

| Chuyên mục | Các lệnh chính | Mô tả |
|---|---|---|
| **Chung (Common)** | `/help`, `/ping`, `/avatar`, `/userinfo`, `/guildinfo`, `/qr`, `/remind` | Lệnh tiện ích, hẹn giờ, tạo QR, xem thông tin |
| **Giftcode** | `/giftcode`, `/giftcode_other` | Tra cứu giftcode game HoYoverse và các game cào tự động |
| **Âm nhạc (Music)** | `/play`, `/pause`, `/skip`, `/stop`, `/queue`, `/np`, `/lyrics`, `/recommend` | Hệ thống nghe nhạc hoàn chỉnh từ YouTube & Spotify |
| **Giọng nói (TTS)** | `/speak`, `/stop-speak` | Đọc văn bản trong kênh thoại bằng giọng AI tự nhiên |
| **Cày cấp (XP)** | `/rank`, `/leaderboard` | Xem thẻ cấp độ cá nhân dạng ảnh Canvas và bảng xếp hạng |
| **Cảm xúc (Emote)**| `/e_hug`, `/e_pat`, `/e_kiss`, `/e_slap`, `/e_punch`, `/e_cry` | Gửi ảnh động anime tương tác qua nekos.best |
| **Cuộc họp (Meeting)**| `/start-tracking`, `/end-tracking` | Bắt đầu/kết thúc điểm danh buổi họp voice và xuất link web |
| **Cài đặt (Settings)**| `/welcome_setting`, `/setting_rolerank`, `/setting_voicetag`,... | Cấu hình các tính năng trực tiếp trong Discord |
| **Ẩn danh (Confession)**| `/confess`, `/config_confession`, `/confession_logs` | Gửi tâm sự ẩn danh kèm nhật ký kiểm duyệt |
| **Theo dõi (Stalk)** | `/stalk`, `/my_stalk`, `/optout` | Đăng ký theo dõi trạng thái bạn bè kèm lệnh từ chối |
| **Hiện diện (Presence)**| `/my_presence`, `/my_github`, `/my_leetcode` | Cấu hình trạng thái public hiển thị lên portfolio cá nhân |

---

## 📜 Nguồn & Thư Viện Tham Khảo

- [discord.js](https://discord.js.org/) & [@discordjs/voice](https://github.com/discordjs/voice) — Kết nối Discord Gateway & Voice streaming
- [Google Gemini](https://ai.google.dev/) / [DeepSeek](https://deepseek.com/) / [AgentRouter](https://agentrouter.org/) — Các mô hình AI LLM
- [nekos.best](https://nekos.best/) — API hình ảnh & GIF anime
- [hoyo-codes](https://docs.hb.seria.moe/) bởi Seria — API giftcode game HoYoverse
- [LRCLIB](https://lrclib.net/) — Dữ liệu lời bài hát đồng bộ
- [Edge TTS](https://github.com/rany2/edge-tts) — Chuyển đổi văn bản thành giọng nói

---

## 📄 Giấy Phép

Dự án được phát hành theo giấy phép **MIT License** — xem chi tiết tại file [LICENSE](LICENSE).
