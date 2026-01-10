# 🦊 Discord Bot - MPC

![Version](https://img.shields.io/github/package-json/v/mpc-ou/discord-bot?style=for-the-badge)
![License](https://img.shields.io/github/license/mpc-ou/discord-bot?style=for-the-badge)
![Top language](https://img.shields.io/github/languages/top/mpc-ou/discord-bot?style=for-the-badge)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blue?style=for-the-badge)

[Vietnamese Version (Phiên bản tiếng Việt)](./README.vi.md)

## 📖 Introduction

A powerful Discord bot built with TypeScript, Discord.js v14, and Fastify. Features include music playback, meeting tracking, attendance management, and more.

### ✨ Key Features

- 🎵 **Music System** - Play music in voice channels
- 📊 **Meeting Tracker** - Track voice channel attendance with detailed reports
- ✅ **Attendance Manager** - Automated attendance tracking for events
- 🌐 **Web Dashboard** - Fastify-based API with authentication
- 🔧 **Slash Commands** - Modern Discord slash command support
- 📝 **TypeScript** - Full type safety and better DX

## 📂 Project Structure

```
discord-bot/
├── src/
│   ├── bot/
│   │   ├── commands/
│   │   │   └── actions/
│   │   │       ├── common/       # Common commands (help, ping)
│   │   │       ├── meeting/      # Meeting tracking commands
│   │   │       └── music/        # Music playback commands
│   │   ├── contexts/            # Context adapters for commands
│   │   ├── events/              # Discord event handlers
│   │   ├── types/               # TypeScript type definitions
│   │   └── utils/               # Utility classes & functions
│   ├── api/
│   │   ├── routes/              # API endpoints
│   │   ├── middlewares/         # Fastify middlewares
│   │   ├── plugins/             # Fastify plugins
│   │   └── services/            # Business logic services
│   ├── config/                  # Configuration files
│   ├── database/                # Database models & migrations
│   ├── shared/                  # Shared types across bot & api
│   └── web/                     # Web dashboard frontend
├── .env.example                 # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- npm or yarn
- PostgreSQL (optional)
- Discord Bot Token

### Installation

1. Clone the repository
```bash
git clone https://github.com/mpc-ou/discord-bot.git
cd discord-bot
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the bot
```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

## 🎮 Commands

### Meeting Tracking

- `/start_tracking [channel] [duration]` - Start tracking voice channel attendance
- `/end_tracking [channel]` - End tracking and generate reports

### General

- `/help [command]` - Display help information
- `/ping` - Check bot latency

## 🛠️ Configuration

Create a `.env` file based on `.env.example`:

```env
# Discord
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_PREFIX=!

# API
API_PORT=3000
JWT_SECRET=your_jwt_secret

# Database (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
```

## 📊 Features in Detail

### Meeting Tracker

Track voice channel meetings with comprehensive attendance reports:
- Automatic join/leave tracking
- Multiple session support per participant
- Detailed timeline with timestamps
- Public summary + private detailed reports
- Auto-end after configurable duration
- Channel deletion handling

### Attendance Manager

Manage event attendance with optional Q&A verification:
- Create timed attendance sessions
- Optional question-answer verification
- Automatic session expiry
- Detailed attendee reports

## 🔧 Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Deploy Commands

```bash
npm run deploy-commands
```

## 📝 API Documentation

The bot includes a Fastify-based REST API for integration:

- `GET /api/guilds` - List guilds
- Authentication via JWT tokens
- CORS enabled for web dashboard

## 🤝 Contributing

We welcome contributions from the community! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please use the provided PR template and ensure:
- All tests pass
- Code follows TypeScript best practices
- Documentation is updated

## 📄 License

This project is licensed under the GPL-2.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) - Powerful Discord API library
- [Fastify](https://www.fastify.io/) - Fast and low overhead web framework
- All contributors who helped shape this project

## 📞 Support

- Create an [Issue](https://github.com/mpc-ou/discord-bot/issues)
- Join our Discord server (if available)

---

Made with ❤️ by MPC Team
