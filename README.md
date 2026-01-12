# 🦊 MPC Discord Bot

![Version](https://img.shields.io/github/package-json/v/mpc-ou/discord-bot?style=for-the-badge)
![License](https://img.shields.io/github/license/mpc-ou/discord-bot?style=for-the-badge)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

[Tiếng Việt](./README.vi.md)

## 📖 Introduction

A powerful and feature-rich Discord Bot built with **TypeScript**, **Discord.js v14**, and **Fastify**. Designed for community management, music playback, meeting tracking, and more.

### ✨ Key Features

- **🎵 Music System**: High-quality music playback from YouTube, Spotify, and YouTube Music.
- **📊 Meeting Tracker**: Track voice channel attendance, generate reports, and manage meeting sessions.
- **✅ Attendance**: Event attendance management with optional Q&A verification.
- **📈 Leveling**: XP system for text and voice activity.
- **🔊 Voice Logging**: Notify when users join, leave, or move between voice channels.
- **🌐 Web Dashboard**: Fastify-powered API and dashboard for management.
- **🌍 Internationalization (i18n)**: Fully supported English (en) and Vietnamese (vi).
- **🔧 Slash Commands**: Modern Discord slash commands interaction.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18 or higher.
- **PostgreSQL**: Required for database (or use SQLite if configured).
- **FFmpeg**: Required for music playback.
- **Discord Bot Token**: Get it from [Discord Developer Portal](https://discord.com/developers/applications).

### 🛠️ Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/mpc-ou/discord-bot.git
    cd discord-bot
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Copy `.env.example` to `.env` and fill in your details:
    ```bash
    cp .env.example .env
    ```
    See `.env.example` for details on required variables.

4.  **Database Setup**
    Ensure your PostgreSQL server is running and the database exists. Then run migrations:
    ```bash
    npm run db:generate
    npm run db:migrate
    # Or use push for quick prototyping
    npm run db:push
    ```

5.  **Deploy Commands**
    Register Slash Commands with Discord:
    ```bash
    npm run deploy-commands
    ```

---

## 🏃‍♂️ Running the Bot

### Development Mode
Runs the bot with hot-reloading using `tsx watch`.
```bash
npm run dev
```

### Production Mode
Build the TypeScript code and start the compiled bot.
```bash
npm run build
npm start
```

---

## 💻 Developer Guide

### Project Structure
```text
src/
├── bot/
│   ├── commands/
│   │   └── actions/     # Command implementations
│   ├── events/          # Event handlers
├── services/            # Business logic (Music, I18n, etc.)
├── database/            # Drizzle ORM schema & migrations
├── api/                 # Fastify API routes
├── config/              # Environment config
└── i18n/                # Locale JSON files
```

### Creating a New Action Command
1.  Create a new file in `src/bot/commands/actions/<category>/<command_name>.action.ts`.
2.  Implement the `ActionCommand` interface:
    ```typescript
    import { ActionCommand } from '@src/shared/types/bot.types';
    import { I18nService } from '@services/I18nService';

    export const myCommand: ActionCommand = {
        name: 'mycommand',
        description: 'Description of command',
        async execute(ctx) {
            await ctx.reply('Hello World!');
        }
    };
    export default myCommand;
    ```
3.  The command loader will automatically register it (restart required).
4.  Run `npm run deploy-commands` if you changed arguments.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

This project is licensed under the **GPL-2.0** License.
