# FoxyBot — Web Dashboard (`apps/web`)

The administrative and interactive frontend for **FoxyBot**, built with [React 19](https://react.dev/), [Vite 7](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/), and [shadcn/ui](https://ui.shadcn.com/).

---

## 🏗️ Architecture & Features

- **Framework**: React 19 + Vite 7 + React Router 7
- **Styling**: Tailwind CSS v4 + Radix UI / shadcn/ui components
- **State Management**: Zustand (client state) + TanStack React Query v5 (server cache & mutations)
- **Real-Time Sync**: Socket.IO client for live Web Music Player

### Page Structure

```
apps/web/src/pages/
├── admin/
│   ├── index.tsx             # Guild selection / server list
│   ├── dashboard.tsx         # Guild overview stats, charts, quick toggles
│   ├── members.tsx           # Member directory & management
│   ├── settings.tsx          # User-level settings (presence, stalk optout)
│   └── settings/
│       ├── welcome.tsx       # Live Canvas card preview & Embed designer
│       ├── chatbot.tsx       # LLM provider, custom API keys, tool whitelist
│       ├── memory.tsx        # AI Guild Memory viewer, editor, and search
│       ├── giftcode.tsx      # Multi-game giftcode notification settings
│       ├── rolerank.tsx      # Level threshold-to-role mapping editor
│       ├── notifications.tsx # Level-up and voice alert notifications
│       └── general.tsx       # Prefix, language, and core feature toggles
├── landing/                  # Public landing page
├── meeting-report.tsx        # Public voice meeting attendance report
├── music.tsx                 # Real-time Web Music Controller & Queue
└── login.tsx, callback.tsx   # Discord OAuth2 flow
```

---

## 🚀 Running the Web Dashboard

```bash
# From repository root:
pnpm dev:web

# Or inside apps/web:
pnpm dev
```

The web dashboard is served at `http://localhost:5173`.
