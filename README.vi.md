# 🤖 MPC Discord Bot

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

Bot Discord đa năng với dashboard web hiện đại. Được xây dựng cho MPC Club với tính ổn định, hiệu suất cao và dễ sử dụng.

[English](README.md) | **Tiếng Việt**

## ✨ Tính năng

### 🎵 Hệ thống nhạc nâng cao
- Phát nhạc chất lượng cao từ YouTube, Spotify, SoundCloud
- Lời bài hát real-time với tự động cuộn
- Quản lý hàng đợi, lặp lại, xáo trộn, bài trước
- Điều khiển âm lượng và phân quyền DJ
- Điều khiển qua web dashboard

### 📊 Hệ thống Level & XP
- Tùy chỉnh tỉ lệ XP cho tin nhắn và hoạt động voice
- Thông báo lên cấp với kênh tùy chỉnh
- Bảng xếp hạng tương tác
- Thưởng role khi đạt level

### 🎮 Minigame
- Oẳn tù tì với theo dõi chuỗi thắng
- Xúc xắc
- Lệnh meme tương tác (ôm, vỗ đầu, hôn, v.v.)

### 👥 Theo dõi cuộc họp
- Theo dõi tham gia kênh thoại
- Tự động ghi lại phiên
- Báo cáo tham gia chi tiết
- Xuất tóm tắt cuộc họp

### 🌐 Web Dashboard
- Thống kê bot real-time
- Quản lý guild
- Điều khiển trình phát nhạc
- Hồ sơ người dùng và bảng xếp hạng
- Thiết kế responsive cho mobile
- Hỗ trợ chế độ tối/sáng

### 🔧 Tiện ích
- Hỗ trợ đa ngôn ngữ (Tiếng Anh, Tiếng Việt)
- Thông tin server và người dùng
- Hiển thị avatar
- Tích hợp GitHub

## 🚀 Bắt đầu nhanh

### Yêu cầu

- **Node.js** v20 trở lên
- **PostgreSQL** database
- **Discord Bot Token** ([Tạo tại đây](https://discord.com/developers/applications))
- **FFmpeg** (cho tính năng voice/nhạc)

### Phát triển Local

1. **Clone và cài đặt dependencies**

   ```bash
   git clone https://github.com/mpc-ou/discord-bot.git
   cd discord-bot
   npm install --legacy-peer-deps
   cd web && npm install && cd ..
   ```

2. **Cấu hình môi trường**

   Copy `.env.example` thành `.env` và điền giá trị:

   ```env
   # Discord
   DISCORD_TOKEN=token_bot_của_bạn
   DISCORD_CLIENT_ID=client_id_của_bạn
   DEVELOPER_ID=["discord_id_của_bạn"]

   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname

   # OAuth (cho Web Dashboard)
   OAUTH_CLIENT_ID=client_id_của_bạn
   OAUTH_CLIENT_SECRET=client_secret_của_bạn
   OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback

   # JWT
   JWT_SECRET=khóa_bí_mật_ngẫu_nhiên

   # Server
   SERVER_HOST=0.0.0.0
   SERVER_PORT=3000
   ```

3. **Thiết lập database**

   ```bash
   npm run db:push
   ```

4. **Build frontend và khởi động bot**

   ```bash
   npm run build  # Build web dashboard
   npm start      # Khởi động bot
   ```

   Để phát triển với hot reload:
   ```bash
   npm run dev      # Bot tự động khởi động lại
   npm run dev:web  # Web dashboard dev server (http://localhost:5173)
   ```

## 🐳 Deploy với Docker

1. **Build và chạy**

   ```bash
   docker build -t discord-bot .
   docker run -d \
     --name discord-bot \
     -p 3000:3000 \
     --env-file .env \
     discord-bot
   ```

## ☁️ Deploy lên Railway

Railway là nền tảng deploy được khuyến nghị.

1. **Kết nối GitHub repository với Railway**
2. **Thêm biến môi trường** từ `.env.example`
3. **Deploy!** Railway sẽ tự động:
   - Cài đặt dependencies
   - Build web dashboard
   - Khởi động bot

Không cần cấu hình thêm - Railway tự động phát hiện scripts trong `package.json`.

## 🛠️ Cấu trúc dự án

```
discord-bot/
├── src/
│   ├── bot/              # Discord.js bot
│   │   ├── commands/     # Slash commands
│   │   ├── events/       # Event handlers
│   │   └── utils/        # Tiện ích bot
│   ├── api/              # Fastify API server
│   │   ├── routes/       # API endpoints
│   │   └── middleware/   # Auth & validation
│   ├── database/         # Drizzle ORM
│   │   └── schema/       # Database schemas
│   ├── services/         # Business logic
│   ├── i18n/             # Bản dịch (en, vi)
│   └── shared/           # Shared types
├── web/                  # React dashboard
│   ├── src/
│   │   ├── pages/        # Trang dashboard
│   │   ├── components/   # UI components
│   │   └── lib/          # Frontend utilities
└── .github/
    └── workflows/        # CI/CD (linting)
```

## 📝 Scripts có sẵn

```bash
npm run dev          # Khởi động bot ở chế độ development
npm run dev:web      # Khởi động web dashboard dev server
npm run build        # Build web dashboard
npm start            # Khởi động bot ở chế độ production
npm run lint         # Chạy ESLint
npm run db:push      # Push database schema
npm run db:studio    # Mở Drizzle Studio (DB GUI)
npm run deploy-commands # Deploy slash commands lên Discord
```

## 🔐 Biến môi trường

Xem `.env.example` cho tất cả các tùy chọn cấu hình.

Biến quan trọng:
- `DISCORD_TOKEN` - Token bot của bạn
- `DATABASE_URL` - Chuỗi kết nối PostgreSQL
- `DEVELOPER_ID` - Mảng các Discord ID có quyền admin
- `JWT_SECRET` - Secret để xác thực web dashboard

## 🤝 Đóng góp

Chào đón mọi đóng góp! Vui lòng:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/tinh-nang-tuyet-voi`)
3. Commit thay đổi (`git commit -m 'Thêm tính năng tuyệt vời'`)
4. Push lên branch (`git push origin feature/tinh-nang-tuyet-voi`)
5. Mở Pull Request

## 📄 License

Dự án này được cấp phép theo GPL-2.0 License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 🙏 Cảm ơn

- [Discord.js](https://discord.js.org/) - Thư viện Discord API
- [Fastify](https://www.fastify.io/) - Web framework nhanh
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [rikn-music-fetcher](https://www.npmjs.com/package/rikn-music-fetcher) - Xử lý nguồn nhạc

---

Được tạo với ❤️ bởi MPC Club
