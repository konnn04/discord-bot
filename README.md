# 🤖 MPC Discord Bot

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

A powerful, full-featured Discord bot with a modern web dashboard. Built for MPC Club with stability, performance, and ease of use in mind.

## ✨ Features

### 🎵 Advanced Music System
- High-quality playback from YouTube, Spotify, SoundCloud
- Real-time lyrics with auto-scroll
- Queue management, loop, shuffle, and previous track
- Volume control and DJ role permissions
- Web dashboard control

### 📊 Leveling & XP System
- Customizable XP rates for messages and voice activity
- Level-up announcements with custom channels
- Interactive leaderboard
- Role rewards for reaching levels

### 🎮 Mini Games
- Rock Paper Scissors with streak tracking
- Dice rolling
- Interactive meme commands (hug, pat, kiss, etc.)

### 👥 Meeting Tracker
- Voice channel attendance tracking
- Automatic session recording
- Detailed participation reports
- Export meeting summaries

### 🌐 Web Dashboard
- Real-time bot statistics
- Guild management
- Music player control
- User profiles and leaderboards
- Mobile-responsive design
- Dark/Light mode support

### 🔧 Utilities
- Multi-language support (English, Vietnamese)
- Server and user information
- Avatar display
- GitHub integration

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20 or higher
- **PostgreSQL** database
- **Discord Bot Token** ([Create one here](https://discord.com/developers/applications))
- **FFmpeg** (for voice/music features)

### Local Development

1. **Clone and install dependencies**

   ```bash
   git clone https://github.com/mpc-ou/discord-bot.git
   cd discord-bot
   npm install --legacy-peer-deps
   cd web && npm install && cd ..
   ```

2. **Environment setup**

   Copy `.env.example` to `.env` and fill in your values:

   ```env
   # Discord
   DISCORD_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_client_id
   DEVELOPER_ID=["your_discord_id"]

   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname

   # OAuth (for Web Dashboard)
   OAUTH_CLIENT_ID=your_client_id
   OAUTH_CLIENT_SECRET=your_client_secret
   OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback

   # JWT
   JWT_SECRET=your_random_secret_key

   # Server
   SERVER_HOST=0.0.0.0
   SERVER_PORT=3000
   ```

3. **Setup database**

   ```bash
   npm run db:push
   ```

4. **Build frontend and start bot**

   ```bash
   npm run build  # Builds web dashboard
   npm start      # Starts the bot
   ```

   For development with hot reload:
   ```bash
   npm run dev      # Bot with auto-restart
   npm run dev:web  # Web dashboard dev server (http://localhost:5173)
   ```

## 🐳 Docker Deployment

1. **Build and run**

   ```bash
   docker build -t discord-bot .
   docker run -d \
     --name discord-bot \
     -p 3000:3000 \
     --env-file .env \
     discord-bot
   ```

## ☁️ Deploy to Railway

Railway is the recommended deployment platform.

1. **Connect your GitHub repository to Railway**
2. **Add environment variables** from `.env.example`
3. **Deploy!** Railway will automatically:
   - Install dependencies
   - Build the web dashboard
   - Start the bot

No additional configuration needed - Railway auto-detects `package.json` scripts.

## 🛠️ Project Structure

```
discord-bot/
├── src/
│   ├── bot/              # Discord.js bot
│   │   ├── commands/     # Slash commands
│   │   ├── events/       # Event handlers
│   │   └── utils/        # Bot utilities
│   ├── api/              # Fastify API server
│   │   ├── routes/       # API endpoints
│   │   └── middleware/   # Auth & validation
│   ├── database/         # Drizzle ORM
│   │   └── schema/       # Database schemas
│   ├── services/         # Business logic
│   ├── i18n/             # Translations (en, vi)
│   └── shared/           # Shared types
├── web/                  # React dashboard
│   ├── src/
│   │   ├── pages/        # Dashboard pages
│   │   ├── components/   # UI components
│   │   └── lib/          # Frontend utilities
└── .github/
    └── workflows/        # CI/CD (linting)
```

## 📝 Available Scripts

```bash
npm run dev          # Start bot in development mode
npm run dev:web      # Start web dashboard dev server
npm run build        # Build web dashboard
npm start            # Start bot in production mode
npm run lint         # Run ESLint
npm run db:push      # Push database schema
npm run db:studio    # Open Drizzle Studio (DB GUI)
npm run deploy-commands # Deploy slash commands to Discord
```

## 🔐 Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DISCORD_TOKEN` - Your bot token
- `DATABASE_URL` - PostgreSQL connection string
- `DEVELOPER_ID` - Array of Discord IDs with admin access
- `JWT_SECRET` - Secret for web dashboard authentication

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GPL-2.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) - Discord API library
- [Fastify](https://www.fastify.io/) - Fast web framework
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [rikn-music-fetcher](https://www.npmjs.com/package/rikn-music-fetcher) - Music source handling

---

Made with ❤️ by MPC Club
