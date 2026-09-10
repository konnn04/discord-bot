import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScenarioMessage {
  initial: string;
  name: string;
  color: string;
  time: string;
  isBot?: boolean;
  chips?: string[];
  text?: string;
  embed?: {
    accent: string;
    title: string;
    desc?: string;
    cardLabel?: string;
    bar?: string;
    barLeft?: string;
    barRight?: string;
    rows?: { k: string; v: string }[];
    footer: string;
  };
}

interface Scenario {
  id: string;
  label: string;
  channel: string;
  caption: string;
  composer: string;
  messages: ScenarioMessage[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "ai",
    label: "Chatbot AI",
    channel: "ai-chat",
    caption: "gemini · deepseek · openai-compatible",
    composer: "@FoxyBot nhắc mình cày daily lúc 9h nhé",
    messages: [
      {
        initial: "K",
        name: "Khánh",
        color: "#f59e0b",
        time: "20:41",
        text: "@FoxyBot có code Star Rail mới chưa? nhớ giúp mình là mình main Zenless nha",
      },
      {
        initial: "F",
        name: "FoxyBot",
        color: "#ff5c26",
        isBot: true,
        time: "20:41",
        chips: ["search_memory", "get_giftcode", "remember"],
        text: "Có 2 code Star Rail còn hiệu lực nha. Mình cũng đã ghi nhớ là bạn main Zenless Zone Zero.",
        embed: {
          accent: "#a855f7",
          title: "Đã lưu vào bộ nhớ của server",
          rows: [
            { k: "khoá", v: "game_chinh" },
            { k: "giá trị", v: "Zenless Zone Zero" },
          ],
          footer: "GuildMemory · nhớ riêng theo từng server",
        },
      },
    ],
  },
  {
    id: "music",
    label: "/play",
    channel: "nhac",
    caption: "điều khiển realtime qua web player",
    composer: "/play mất kết nối",
    messages: [
      {
        initial: "L",
        name: "Linh",
        color: "#38bdf8",
        time: "21:03",
        text: "/play mất kết nối",
      },
      {
        initial: "F",
        name: "FoxyBot",
        color: "#ff5c26",
        isBot: true,
        time: "21:03",
        text: "Đã thêm vào hàng chờ và bắt đầu phát trong Lounge.",
        embed: {
          accent: "#22c55e",
          title: "Đang phát · Mất Kết Nối",
          desc: "Dương Domic · yêu cầu bởi Linh",
          bar: "42%",
          barLeft: "1:48",
          barRight: "4:12",
          rows: [
            { k: "hàng chờ", v: "3 bài" },
            { k: "nguồn", v: "YouTube" },
            { k: "âm lượng", v: "60%" },
          ],
          footer: "Mở web player để kéo hàng chờ, xem lyrics",
        },
      },
    ],
  },
  {
    id: "xp",
    label: "/rank",
    channel: "general",
    caption: "XP gom buffer, ghi DB mỗi 30 giây",
    composer: "/rank",
    messages: [
      {
        initial: "K",
        name: "Khánh",
        color: "#f59e0b",
        time: "19:12",
        text: "/rank",
      },
      {
        initial: "F",
        name: "FoxyBot",
        color: "#ff5c26",
        isBot: true,
        time: "19:12",
        embed: {
          accent: "#ff5c26",
          title: "Khánh · Level 27",
          cardLabel: "rank card render sắc nét bằng @napi-rs/canvas",
          bar: "78%",
          barLeft: "12.4k XP",
          barRight: "14k để lên 28",
          rows: [
            { k: "hạng tháng", v: "#3 / 412" },
            { k: "giờ voice", v: "61h" },
            { k: "role vừa nhận", v: "Veteran" },
          ],
          footer: "Role Rank tự cấp khi vượt mốc level",
        },
      },
    ],
  },
  {
    id: "giftcode",
    label: "giftcode",
    channel: "thong-bao",
    caption: "poller HoYoverse + crawler 5 game khác",
    composer: "/giftcode game: Genshin Impact",
    messages: [
      {
        initial: "F",
        name: "FoxyBot",
        color: "#ff5c26",
        isBot: true,
        time: "08:00",
        text: "@Genshin Có code mới vừa phát!",
        embed: {
          accent: "#3b82f6",
          title: "Genshin Impact · 2 code mới",
          desc: "GENSHINGIFT · SEPT2026NEW — bấm để đổi trên web",
          rows: [
            { k: "nguồn", v: "HoYoverse API" },
            { k: "ping", v: "@Genshin" },
            { k: "trùng lặp", v: "đã lọc hash" },
          ],
          footer: "Chế độ perGame · ping đúng role từng game",
        },
      },
      {
        initial: "M",
        name: "Mai",
        color: "#ec4899",
        time: "08:01",
        text: "nhanh thế, chưa mở game đã thấy code r",
      },
    ],
  },
];

const CHANNELS = [
  { id: "general", name: "general" },
  { id: "ai-chat", name: "ai-chat" },
  { id: "nhac", name: "nhac" },
  { id: "thong-bao", name: "thong-bao" },
];

export function HeroSection() {
  const [activeTab, setActiveTab] = useState("ai");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched) return;
    const interval = setInterval(() => {
      setActiveTab((curr) => {
        const idx = SCENARIOS.findIndex((s) => s.id === curr);
        return SCENARIOS[(idx + 1) % SCENARIOS.length].id;
      });
    }, 5500);
    return () => clearInterval(interval);
  }, [touched]);

  const current = SCENARIOS.find((s) => s.id === activeTab) || SCENARIOS[0];

  return (
    <section className="relative overflow-hidden py-12 lg:py-20">
      {/* Subtle Background glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[420px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,var(--primary)/15,transparent_70%)]" />

      <div className="container relative mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Heading & CTA */}
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1.5 font-mono text-xs text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              mã nguồn mở · self-host được
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.08]">
              Một con bot làm{" "}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-purple-600 bg-clip-text text-transparent">
                tất cả việc nặng
              </span>{" "}
              cho server của bạn
            </h1>

            <p className="mt-5 text-base text-muted-foreground sm:text-lg leading-relaxed">
              Chatbot AI có bộ nhớ riêng từng server, music player điều khiển
              qua web, XP &amp; rank card, giftcode 10 game, báo cáo họp voice —
              quản lý toàn bộ bằng dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild className="gap-2 font-bold shadow-md">
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Thêm vào Discord
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2">
                <Link to="/admin">
                  Mở Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-8 border-t border-border/60 pt-6">
              <div>
                <div className="font-mono text-2xl font-bold text-primary">
                  50+
                </div>
                <div className="text-xs text-muted-foreground">slash commands</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-primary">
                  10
                </div>
                <div className="text-xs text-muted-foreground">game giftcodes</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-primary">
                  3
                </div>
                <div className="text-xs text-muted-foreground">nhà cung cấp LLM</div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentic Discord Simulator */}
          <div className="lg:col-span-6 xl:col-span-7">
            {/* Scenario Tabs */}
            <div className="mb-3 flex flex-wrap gap-2">
              {SCENARIOS.map((s) => {
                const active = s.id === activeTab;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveTab(s.id);
                      setTouched(true);
                    }}
                    className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${
                      active
                        ? "border-primary/60 bg-primary/15 text-primary font-semibold shadow-xs"
                        : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Discord Window Frame (Styled with authentic Discord dark theme palette) */}
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-[#313338] text-[#dbdee1] shadow-2xl">
              {/* Title Bar */}
              <div className="flex items-center gap-2 border-b border-[#232428] bg-[#1e1f22] px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#4e5058]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#4e5058]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#4e5058]" />
                <span className="ml-2 font-mono text-xs text-[#949ba4]">
                  discord · máy chủ của bạn
                </span>
              </div>

              {/* Main Body */}
              <div className="flex">
                {/* Left Channel Sidebar */}
                <div className="hidden w-36 shrink-0 border-r border-[#232428] bg-[#2b2d31] p-3 sm:flex sm:flex-col sm:gap-1">
                  <div className="px-1.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#949ba4]">
                    Kênh văn bản
                  </div>
                  {CHANNELS.map((ch) => {
                    const isSelected = ch.id === current.channel;
                    return (
                      <div
                        key={ch.id}
                        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                          isSelected
                            ? "bg-[#35373c] font-semibold text-white"
                            : "text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]"
                        }`}
                      >
                        <span className="font-mono text-[#80848e]">#</span>
                        <span className="truncate">{ch.name}</span>
                      </div>
                    );
                  })}
                  <div className="mt-3 px-1.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#949ba4]">
                    Thoại
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#949ba4]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Lounge · 4</span>
                  </div>
                </div>

                {/* Right Chat Area */}
                <div className="flex min-h-[400px] flex-1 flex-col justify-between bg-[#313338]">
                  {/* Channel Header */}
                  <div className="flex items-center justify-between border-b border-[#2b2d31] px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-1 font-semibold text-white">
                      <span className="font-mono text-[#80848e]">#</span>
                      {current.channel}
                    </div>
                    <span className="font-mono text-[11px] text-[#949ba4]">
                      {current.caption}
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="flex flex-col gap-4 p-4">
                    {current.messages.map((m, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div
                          style={{ backgroundColor: m.color }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs text-[#1e1f22]"
                        >
                          {m.initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold ${
                                m.isBot ? "text-[#5865f2]" : "text-[#f2f3f5]"
                              }`}
                            >
                              {m.name}
                            </span>
                            {m.isBot && (
                              <span className="rounded bg-[#5865f2] px-1.5 py-0.5 text-[9px] font-bold text-white">
                                BOT
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-[#949ba4]">
                              {m.time}
                            </span>
                          </div>

                          {m.chips && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {m.chips.map((chip, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 font-mono text-[10px] text-purple-300"
                                >
                                  {chip}
                                </span>
                              ))}
                            </div>
                          )}

                          {m.text && (
                            <div className="mt-1 text-xs text-[#dbdee1] leading-relaxed">
                              {m.text}
                            </div>
                          )}

                          {m.embed && (
                            <div className="mt-2.5 flex max-w-md overflow-hidden rounded-lg bg-[#2b2d31]">
                              <div
                                style={{ backgroundColor: m.embed.accent }}
                                className="w-1 shrink-0"
                              />
                              <div className="p-3">
                                <div className="text-xs font-bold text-[#f2f3f5]">
                                  {m.embed.title}
                                </div>
                                {m.embed.desc && (
                                  <div className="mt-1 text-[11px] text-[#949ba4]">
                                    {m.embed.desc}
                                  </div>
                                )}
                                {m.embed.cardLabel && (
                                  <div className="mt-2 rounded border border-dashed border-[#4e5058] bg-[#1e1f22] p-2 text-center font-mono text-[10px] text-[#949ba4]">
                                    {m.embed.cardLabel}
                                  </div>
                                )}
                                {m.embed.bar && (
                                  <div className="mt-2">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1e1f22]">
                                      <div
                                        style={{
                                          width: m.embed.bar,
                                          backgroundColor: m.embed.accent,
                                        }}
                                        className="h-full rounded-full"
                                      />
                                    </div>
                                    <div className="mt-1 flex justify-between font-mono text-[10px] text-[#949ba4]">
                                      <span>{m.embed.barLeft}</span>
                                      <span>{m.embed.barRight}</span>
                                    </div>
                                  </div>
                                )}
                                {m.embed.rows && (
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    {m.embed.rows.map((r, rIdx) => (
                                      <div key={rIdx}>
                                        <div className="text-[10px] uppercase text-[#949ba4]">
                                          {r.k}
                                        </div>
                                        <div className="font-mono text-xs text-[#dbdee1]">
                                          {r.v}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="mt-2 font-mono text-[10px] text-[#80848e]">
                                  {m.embed.footer}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input Box */}
                  <div className="p-3">
                    <div className="flex items-center gap-2 rounded-lg bg-[#383a40] px-3 py-2 text-xs text-[#949ba4]">
                      <span className="text-sm font-bold">+</span>
                      <span className="truncate font-mono">
                        {current.composer}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
