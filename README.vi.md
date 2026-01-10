# 🦊 Discord Bot - MPC

![Version](https://img.shields.io/github/package-json/v/mpc-ou/discord-bot?style=for-the-badge)
![License](https://img.shields.io/github/license/mpc-ou/discord-bot?style=for-the-badge)
![Top language](https://img.shields.io/github/languages/top/mpc-ou/discord-bot?style=for-the-badge)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blue?style=for-the-badge)

[English Version](./README.md)

## 📖 Giới thiệu

Bot Discord mạnh mẽ được xây dựng bằng TypeScript, Discord.js v14 và Fastify. Bao gồm các tính năng phát nhạc, theo dõi cuộc họp, quản lý điểm danh và nhiều hơn nữa.

### ✨ Tính năng chính

- 🎵 **Hệ thống âm nhạc** - Phát nhạc trong kênh voice
- 📊 **Theo dõi cuộc họp** - Theo dõi thời gian tham gia kênh voice với báo cáo chi tiết
- ✅ **Quản lý điểm danh** - Điểm danh tự động cho sự kiện
- 🌐 **Bảng điều khiển Web** - API Fastify với xác thực
- 🔧 **Lệnh Slash** - Hỗ trợ slash command hiện đại của Discord
- 📝 **TypeScript** - Type safety đầy đủ và trải nghiệm phát triển tốt hơn

## 📂 Cấu trúc dự án

```
discord-bot/
├── src/
│   ├── bot/
│   │   ├── commands/
│   │   │   └── actions/
│   │   │       ├── common/       # Lệnh chung (help, ping)
│   │   │       ├── meeting/      # Lệnh theo dõi cuộc họp
│   │   │       └── music/        # Lệnh phát nhạc
│   │   ├── contexts/            # Context adapter cho lệnh
│   │   ├── events/              # Xử lý sự kiện Discord
│   │   ├── types/               # Định nghĩa kiểu TypeScript
│   │   └── utils/               # Class & function tiện ích
│   ├── api/
│   │   ├── routes/              # API endpoints
│   │   ├── middlewares/         # Fastify middlewares
│   │   ├── plugins/             # Fastify plugins
│   │   └── services/            # Business logic services
│   ├── config/                  # File cấu hình
│   ├── database/                # Database models & migrations
│   ├── shared/                  # Shared types giữa bot & api
│   └── web/                     # Frontend bảng điều khiển web
├── .env.example                 # Template biến môi trường
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Bắt đầu

### Yêu cầu

- Node.js >= 18.x
- npm hoặc yarn
- PostgreSQL (tùy chọn)
- Discord Bot Token

### Cài đặt

1. Clone repository
```bash
git clone https://github.com/mpc-ou/discord-bot.git
cd discord-bot
```

2. Cài đặt các phụ thuộc
```bash
npm install
```

3. Cấu hình biến môi trường
```bash
cp .env.example .env
# Chỉnh sửa .env với cấu hình của bạn
```

4. Khởi động bot
```bash
# Chế độ development với hot reload
npm run dev

# Build production
npm run build
npm start
```

## 🎮 Lệnh

### Theo dõi cuộc họp

- `/start_tracking [channel] [duration]` - Bắt đầu theo dõi thời gian tham gia kênh voice
- `/end_tracking [channel]` - Kết thúc theo dõi và tạo báo cáo

### Chung

- `/help [command]` - Hiển thị thông tin trợ giúp
- `/ping` - Kiểm tra độ trễ của bot

## 🛠️ Cấu hình

Tạo file `.env` dựa trên `.env.example`:

```env
# Discord
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_PREFIX=!

# API
API_PORT=3000
JWT_SECRET=your_jwt_secret

# Database (tùy chọn)
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
```

## 📊 Chi tiết tính năng

### Theo dõi cuộc họp

Theo dõi các cuộc họp trong kênh voice với báo cáo điểm danh chi tiết:
- Tự động theo dõi tham gia/rời khỏi
- Hỗ trợ nhiều phiên cho mỗi thành viên
- Timeline chi tiết với timestamps
- Báo cáo tóm tắt công khai + báo cáo chi tiết riêng tư
- Tự động kết thúc sau thời gian cấu hình
- Xử lý khi kênh bị xóa

### Quản lý điểm danh

Quản lý điểm danh sự kiện với xác minh hỏi đáp tùy chọn:
- Tạo phiên điểm danh có thời hạn
- Xác minh câu hỏi-trả lời tùy chọn
- Tự động hết hạn phiên
- Báo cáo người tham dự chi tiết

## 🔧 Phát triển

### Build

```bash
npm run build
```

### Chế độ Watch

```bash
npm run dev
```

### Deploy Commands

```bash
npm run deploy-commands
```

## 📝 Tài liệu API

Bot bao gồm REST API dựa trên Fastify để tích hợp:

- `GET /api/guilds` - Danh sách guilds
- Xác thực qua JWT tokens
- CORS được bật cho bảng điều khiển web

## 🤝 Đóng góp

Chúng tôi hoan nghênh mọi đóng góp từ cộng đồng! Vui lòng làm theo các bước sau:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/tinh-nang-tuyet-voi`)
3. Commit thay đổi (`git commit -m 'Thêm tính năng tuyệt vời'`)
4. Push lên branch (`git push origin feature/tinh-nang-tuyet-voi`)
5. Mở Pull Request

Vui lòng sử dụng template PR được cung cấp và đảm bảo:
- Tất cả tests đều pass
- Code tuân theo best practices của TypeScript
- Documentation được cập nhật

## 📄 Giấy phép

Dự án này được cấp phép theo Giấy phép GPL-2.0 - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 🙏 Cảm ơn

- [Discord.js](https://discord.js.org/) - Thư viện Discord API mạnh mẽ
- [Fastify](https://www.fastify.io/) - Web framework nhanh và hiệu quả
- Tất cả contributors đã giúp định hình dự án này

## 📞 Hỗ trợ

- Tạo [Issue](https://github.com/mpc-ou/discord-bot/issues)
- Tham gia Discord server của chúng tôi (nếu có)

---

Được tạo với ❤️ bởi MPC Team
