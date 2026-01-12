# 🤖 Discord Music & Management Bot

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)

A powerful, full-featured Discord bot with a modern web dashboard. Built for stability, performance, and ease of use.

## ✨ Features

- 🎵 **Advanced Music System**
  - High-quality playback from various sources
  - DJ roles and access management
  - Queue management, loop, shuffle, and lyrics

- 🛡️ **Moderation & Management**
  - Kick, Ban, Timeout, and Warn users
  - Role management (Auto-role, Reaction roles)
  - Detailed Audit Logs

- 📊 **Web Dashboard**
  - Real-time statistics and control
  - Managing settings per guild
  - Mobile-responsive design

- 📈 **Leveling & XP**
  - Customizable XP rates
  - Level-up announcements and roles
  - Leaderboard

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL
- Discord Application (Bot Token + Client ID)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/discord-bot.git
   cd discord-bot
   ```

2. **Install dependencies**

   ```bash
   # Root dependencies
   npm install

   # Web dashboard dependencies
   cd web
   npm install
   cd ..
   ```

3. **Environment Setup**

   Create a `.env` file based on `.env.example`:

   ```env
   # Discord
   DISCORD_TOKEN=your_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   DEVELOPER_ID=["your_id_here"]

   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname

   # Web Dashboard
   VITE_API_URL=http://localhost:3000
   ```

4. **Database Migration**

   ```bash
   npm run db:push
   ```

5. **Run the Bot**

   ```bash
   # Development Mode (Bot + Dashboard)
   npm run dev

   # Production Build
   npm run build
   npm start
   ```

## 🐳 Docker Deployment

A `Dockerfile` is included for easy deployment.

1. **Build the image**

   ```bash
   docker build -t discord-bot .
   ```

2. **Run the container**

   ```bash
   docker run -d --env-file .env -p 3000:3000 discord-bot
   ```

## 🛠️ Project Structure

- `src/bot`: Discord.js bot client and commands
- `src/api`: Fastify API server
- `src/shared`: Shared types and utilities
- `web`: React + Vite dashboard
- `src/database`: Drizzle ORM schemas and migrations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
