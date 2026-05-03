# Discord Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Đọc bằng ngôn ngữ khác: [English](README.md), [Tiếng Việt](README.vi.md).*

Một bot Discord đa năng, module hóa được xây dựng bằng **NestJS**, **Prisma (PostgreSQL)**, và một giao diện quản lý bằng **React/Vite**. Dự án được thiết kế dạng monorepo sử dụng **pnpm workspaces**, giúp dễ dàng chia sẻ code và mở rộng.

## Tính Năng Nổi Bật

- **Kiến trúc Module**: Xây dựng với NestJS, tận dụng dependency injection giúp logic backend dễ mở rộng.
- **Tải Lệnh & Sự kiện Động**: Tự động nhận dạng và đăng ký các command (lệnh) và event của Discord.
- **Hệ thống Cấu hình Mạnh mẽ**: Lưu trữ cài đặt toàn cầu và cài đặt cho từng server bằng PostgreSQL (JSONB) kết hợp cache in-memory để truy xuất cực nhanh.
- **Hệ thống Cấp độ (XP)**: Theo dõi hoạt động của người dùng ở cả kênh chat và voice, tự động thăng cấp và tạo bảng xếp hạng.
- **Thông báo Tự động**: Lên lịch tự động thông qua `@nestjs/schedule` (ví dụ: Tự động quét và thông báo giftcode Hoyoverse).
- **Web Dashboard**: Ứng dụng Frontend React + Vite được tích hợp sẵn giúp quản lý và cấu hình dễ dàng.
- **Public Presence API**: API tương tự như Lanyard giúp hiển thị trạng thái Discord lên các trang portfolio cá nhân.

## Cấu Trúc Monorepo

```
discord-bot/
├── apps/
│   ├── api/       # Backend NestJS & logic của Discord bot
│   └── web/       # Frontend dashboard React (Vite)
├── packages/
│   └── shared/    # Các type, hằng số và tiện ích dùng chung
└── docker-compose.yml
```

## Yêu Cầu Hệ Thống

- Node.js (v20 trở lên)
- pnpm (v10)
- PostgreSQL
- Discord Bot Token

## Cài Đặt

1. **Clone kho lưu trữ:**
   ```bash
   git clone https://github.com/yourusername/discord-bot.git
   cd discord-bot
   ```

2. **Cài đặt thư viện:**
   ```bash
   pnpm install
   ```

3. **Cấu hình Biến Môi trường:**
   Tạo file `.env` bên trong thư mục `apps/api/`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/discord_bot?schema=public"
   DISCORD_TOKEN="your-discord-bot-token"
   ```

4. **Khởi tạo Database:**
   ```bash
   cd apps/api
   npx prisma generate
   npx prisma db push
   ```

## Chạy Dự Án

### Môi trường Phát triển (Development)
Chạy ứng dụng trong môi trường dev (chạy cùng lúc cả API và Web):
```bash
pnpm dev
```

### Môi trường Thực tế (Production / Docker)
Dự án đã có sẵn file `docker-compose.yml` để bạn dễ dàng triển khai toàn bộ hệ thống:
```bash
docker-compose up -d --build
```

## Đóng Góp (Contributing)

Chúng tôi luôn hoan nghênh sự đóng góp của mọi người! Vui lòng tham khảo file [CONTRIBUTING.md](CONTRIBUTING.md) để biết chi tiết về các quy định và quy trình gửi pull requests.

## Nguồn & API Bổ Sung (Credits)

Dự án có sử dụng các API tuyệt vời từ cộng đồng:
- [nekos.best](https://nekos.best/) - Sử dụng để tạo ảnh GIF tương tác kiểu anime (ôm, xoa đầu, đấm, v.v.).
- [hoyo-codes](https://docs.hb.seria.moe/) bởi Seria - Sử dụng để lấy dữ liệu giftcode mới nhất của nhà Hoyoverse cho tính năng auto-tracker.

## Giấy Phép

Dự án này sử dụng giấy phép MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.
