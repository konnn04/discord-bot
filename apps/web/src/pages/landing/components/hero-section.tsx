import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Lệnh", value: "50+" },
  { label: "Tính năng", value: "30+" },
  { label: "Uptime", value: "99.9%" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20">
      <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-background to-purple-500/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/20 via-background to-background" />

      <div className="container relative mx-auto text-center">
        <Badge variant="outline" className="mb-6 gap-1.5 px-4 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
          Discord Bot đa năng cho server của bạn
        </Badge>

        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          Quản lý Discord{" "}
          <span className="bg-linear-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            thông minh hơn
          </span>{" "}
          với FoxyBot
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Chatbot AI, music player, XP &amp; level, chào mừng bằng ảnh, đọc chat
          giọng nói — tất cả trong một bot với dashboard web hiện đại.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" className="gap-2 text-base" asChild>
            <Link to="/admin">
              Bắt đầu quản lý <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="gap-2 text-base" asChild>
            <a href="https://github.com/konnn04/discord-bot" target="_blank" rel="noreferrer">
              <Bot className="h-5 w-5" />
              Triển khai ngay!
            </a>
          </Button>
        </div>

        <div className="mt-12 flex items-center justify-center gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-primary">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
