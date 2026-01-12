# 🦊 MPC Discord Bot

![Version](https://img.shields.io/github/package-json/v/mpc-ou/discord-bot?style=for-the-badge)
![License](https://img.shields.io/github/license/mpc-ou/discord-bot?style=for-the-badge)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

[English Version](./README.md)

## 📖 Giới thiệu

Bot Discord mạnh mẽ và đầy đủ tính năng được xây dựng bằng **TypeScript**, **Discord.js v14**, và **Fastify**. Được thiết kế để quản lý cộng đồng, phát nhạc, theo dõi cuộc họp và nhiều tính năng khác.

### ✨ Tính năng chính

- **🎵 Hệ thống Âm nhạc**: Phát nhạc chất lượng cao từ YouTube, Spotify, và YouTube Music.
- **📊 Theo dõi Cuộc họp**: Ghi lại thời gian tham gia voice, tạo báo cáo và quản lý phiên họp.
- **✅ Điểm danh**: Quản lý điểm danh sự kiện với xác minh hỏi-đáp (tùy chọn).
- **📈 Leveling**: Hệ thống cấp độ (XP) cho tin nhắn và voice.
- **🔊 Nhật ký Voice (Voice Log)**: Thông báo khi thành viên vào/ra hoặc chuyển kênh voice.
- **🌐 Web Dashboard**: API và giao diện quản lý tích hợp sẵn (Fastify).
- **🌍 Đa ngôn ngữ (i18n)**: Hỗ trợ hoàn toàn Tiếng Việt (vi) và Tiếng Anh (en).
- **🔧 Slash Commands**: Tương tác hiện đại với Discord Slash Commands.

---

## 🚀 Bắt đầu

### Yêu cầu tiên quyết

- **Node.js**: Phiên bản 18 trở lên.
- **PostgreSQL**: Dùng làm database chính.
- **FFmpeg**: Cần thiết để xử lý âm thanh (nhạc).
- **Discord Bot Token**: Lấy tại [Discord Developer Portal](https://discord.com/developers/applications).

### 🛠️ Cài đặt

1.  **Clone mã nguồn**
    ```bash
    git clone https://github.com/mpc-ou/discord-bot.git
    cd discord-bot
    ```

2.  **Cài đặt thư viện**
    ```bash
    npm install
    ```

3.  **Cấu hình môi trường (.env)**
    Sao chép file mẫu và điền thông tin của bạn:
    ```bash
    cp .env.example .env
    ```
    Hãy mở file `.env` và điền đầy đủ các thông tin như `DISCORD_TOKEN`, `DATABASE_URL`... (Xem `.env.example` để biết thêm chi tiết).

4.  **Cài đặt Database**
    Đảm bảo PostgreSQL đang chạy và database đã được tạo. Sau đó chạy lệnh sau để tạo bảng:
    ```bash
    # Tạo migration files
    npm run db:generate
    
    # Chạy migration để cập nhật database
    npm run db:migrate
    
    # Hoặc dùng push (cho môi trường dev)
    npm run db:push
    ```

5.  **Triển khai Lệnh (Deploy Commands)**
    Đăng ký Slash Commands với server Discord của bạn:
    ```bash
    npm run deploy-commands
    ```

---

## 🏃‍♂️ Chạy Bot

### Môi trường Development
Chạy bot với tính năng hot-reload (tự động khởi động lại khi sửa code):
```bash
npm run dev
```

### Môi trường Production
Build code TypeScript sang JavaScript và chạy:
```bash
npm run build
npm start
```

---

## � Hướng dẫn cho Developer

### Cấu trúc dự án
```text
src/
├── bot/
│   ├── commands/
│   │   └── actions/     # Chứa logic các lệnh của bot
│   ├── events/          # Xử lý sự kiện (message, voiceState...)
├── services/            # Business logic (Music, I18n, GuildSettings...)
├── database/            # Drizzle ORM schema & migrations
├── api/                 # Fastify API routes
├── config/              # File cấu hình môi trường
└── i18n/                # Các file ngôn ngữ (en.json, vi.json)
```

### Cách tạo một Action Command mới
Bot sử dụng cơ chế file-based routing cho commands. Để thêm lệnh mới:

1.  Tạo file mới trong `src/bot/commands/actions/<tên_thư_mục>/<tên_lệnh>.action.ts`.
2.  Export một object tuân theo interface `ActionCommand`:
    ```typescript
    import { ActionCommand } from '@src/shared/types/bot.types';
    import { I18nService } from '@services/I18nService';

    export const xinChaoCommand: ActionCommand = {
        name: 'xinchao', // Tên lệnh dùng trong slash command
        description: 'Gửi lời chào',
        async execute(ctx) {
            // Logic xử lý
            await ctx.reply('Xin chào bạn!');
        }
    };
    export default xinChaoCommand;
    ```
3.  Lưu file. Bot (ở chế độ dev) sẽ tự động nhận diện.
4.  Nếu bạn thay đổi tham số (options) của lệnh, hãy chạy lại `npm run deploy-commands` để cập nhật với Discord.

---

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Hãy mở Issue hoặc gửi Pull Request trên GitHub.

## 📄 Bản quyền

Dự án này được cấp phép theo giấy phép **GPL-2.0**.
