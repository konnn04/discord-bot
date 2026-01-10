# 🤝 Hướng dẫn đóng góp

Cảm ơn bạn đã quan tâm đến việc đóng góp cho Discord Bot MPC! Tài liệu này sẽ hướng dẫn bạn qua quy trình đóng góp.

## 📋 Mục lục

- [Code of Conduct](#code-of-conduct)
- [Bắt đầu](#bắt-đầu)
- [Quy trình phát triển](#quy-trình-phát-triển)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## 📜 Code of Conduct

Khi tham gia dự án, bạn cần tuân thủ các nguyên tắc:
- Tôn trọng tất cả contributors
- Sử dụng ngôn ngữ thân thiện và chuyên nghiệp
- Chấp nhận phản hồi mang tính xây dựng
- Tập trung vào điều tốt nhất cho cộng đồng

## 🚀 Bắt đầu

### Fork và Clone

1. Fork repository về tài khoản của bạn
2. Clone fork về máy:
```bash
git clone https://github.com/YOUR_USERNAME/discord-bot.git
cd discord-bot
```

3. Thêm upstream remote:
```bash
git remote add upstream https://github.com/mpc-ou/discord-bot.git
```

### Cài đặt Dependencies

```bash
npm install
```

### Chạy Development Server

```bash
npm run dev
```

## 🔄 Quy trình phát triển

### 1. Tạo Branch mới

```bash
git checkout -b feature/ten-tinh-nang
# hoặc
git checkout -b fix/ten-loi
```

Quy ước đặt tên branch:
- `feature/` - Tính năng mới
- `fix/` - Sửa lỗi
- `docs/` - Cập nhật documentation
- `refactor/` - Refactor code
- `test/` - Thêm/sửa tests
- `chore/` - Cập nhật dependencies, config, etc.

### 2. Development

- Viết code theo [Coding Standards](#coding-standards)
- Test thường xuyên
- Commit code theo [Commit Messages](#commit-messages)

### 3. Sync với Upstream

```bash
git fetch upstream
git rebase upstream/main
```

### 4. Push Changes

```bash
git push origin feature/ten-tinh-nang
```

## 💻 Coding Standards

### TypeScript

- Sử dụng TypeScript strict mode
- Định nghĩa types rõ ràng, tránh `any`
- Sử dụng interfaces cho object types
- Export types khi cần thiết

```typescript
interface User {
  id: string;
  name: string;
  age?: number;
}

function getUser(id: string): Promise<User> {
  // ...
}
```

### Code Style

- Sử dụng 2 spaces cho indentation
- Sử dụng single quotes cho strings
- Thêm semicolons ở cuối statements
- Tối đa 100 ký tự mỗi dòng

### File Organization

- Một file một component/class chính
- Đặt tên file theo PascalCase cho classes
- Đặt tên file theo camelCase cho utilities
- Group imports: external → internal → types

```typescript
import { Client } from 'discord.js';
import { config } from '@/config';
import type { BotClient } from '@/types';
```

### Comments

- Tránh comment quá nhiều (code nên tự giải thích)
- Comment cho logic phức tạp
- JSDoc cho public APIs

```typescript
/**
 * Track voice channel meeting attendance
 * @param channelId - Voice channel ID to track
 * @param duration - Duration in minutes
 * @returns Meeting session
 */
async function startTracking(channelId: string, duration: number): Promise<MeetingSession> {
  // Implementation
}
```

## 📝 Commit Messages

Sử dụng conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - Tính năng mới
- `fix` - Sửa lỗi
- `docs` - Documentation
- `style` - Formatting, missing semicolons, etc.
- `refactor` - Code refactoring
- `test` - Thêm/sửa tests
- `chore` - Dependencies, config, etc.

### Examples

```bash
feat(meeting): add participant list to summary report

- Display up to 50 participants in basic report
- Sort by total duration
- Show overflow indicator

Closes #123
```

```bash
fix(tracker): handle channel deletion properly

When a voice channel is deleted, the tracking session
should be automatically cancelled to prevent orphaned sessions.
```

## 🔀 Pull Request Process

### Trước khi tạo PR

- [ ] Code đã được test kỹ
- [ ] TypeScript build không có lỗi
- [ ] Đã sync với upstream/main
- [ ] Commit messages tuân theo format
- [ ] Documentation đã được cập nhật

### Tạo Pull Request

1. Push branch lên fork của bạn
2. Mở PR từ fork về main repository
3. Điền đầy đủ PR template
4. Link đến related issues
5. Request review từ maintainers

### Review Process

- Maintainers sẽ review trong vòng 2-3 ngày
- Thực hiện các thay đổi được yêu cầu
- PR cần ít nhất 1 approval
- CI/CD phải pass

### Merge

- Squash merge được ưu tiên
- Maintainers sẽ merge sau khi approve

## 🐛 Báo cáo Bugs

Sử dụng [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) và cung cấp:
- Mô tả rõ ràng
- Các bước tái hiện
- Kết quả mong đợi vs thực tế
- Môi trường (OS, Node version, etc.)
- Logs/Screenshots

## 💡 Đề xuất Features

Sử dụng [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) và giải thích:
- Vấn đề cần giải quyết
- Giải pháp đề xuất
- Lợi ích mang lại
- Các phương án thay thế

## 📞 Liên hệ

- GitHub Issues: [Issues](https://github.com/mpc-ou/discord-bot/issues)
- Discord Server: TBA

## 🙏 Cảm ơn

Cảm ơn bạn đã dành thời gian đóng góp! Mọi đóng góp, dù lớn hay nhỏ, đều được đánh giá cao.

---

❤️ MPC Team
