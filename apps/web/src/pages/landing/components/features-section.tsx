import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Music,
  MessageSquare,
  Shield,
  Zap,
  BarChart3,
  Activity,
  Gamepad2,
  Globe,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}

const features: Feature[] = [
  {
    icon: Music,
    title: "Music Player",
    description:
      "Phát nhạc từ YouTube, Spotify với giao diện web trực quan. Playlist, queue, lyrics đầy đủ.",
    badge: "Hot",
  },
  {
    icon: MessageSquare,
    title: "XP & Leveling",
    description:
      "Hệ thống level theo tin nhắn và voice. Bảng xếp hạng, level card đẹp mắt.",
  },
  {
    icon: Shield,
    title: "Moderation",
    description:
      "Quản lý server dễ dàng với các lệnh kick, ban, timeout và log channel.",
  },
  {
    icon: Gamepad2,
    title: "Mini Games",
    description:
      "Gacha game Micho SGC, LeetCode daily challenge, confession và nhiều hơn nữa.",
  },
  {
    icon: Activity,
    title: "Presence Tracking",
    description:
      "Theo dõi hoạt động GitHub, LeetCode, Spotify của thành viên theo thời gian thực.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Biểu đồ tin nhắn, XP, tần suất online. Dashboard quản lý đầy đủ số liệu.",
  },
  {
    icon: Globe,
    title: "Web Dashboard",
    description:
      "Quản lý toàn bộ server qua giao diện web hiện đại. Không cần nhớ lệnh.",
  },
  {
    icon: Zap,
    title: "High Performance",
    description:
      "Xử lý tin nhắn realtime, queue music mượt mà, WebSocket cho cập nhật tức thì.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Tính năng
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Mọi thứ bạn cần cho server Discord
          </h2>
          <p className="mt-4 text-muted-foreground">
            Từ music player đến quản lý thành viên, FoxyBot có đầy đủ công cụ
            để server của bạn hoạt động hiệu quả.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group relative overflow-hidden border-muted transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {feature.title}
                  {feature.badge && (
                    <Badge className="bg-yellow-500/10 text-yellow-600 text-[10px]">
                      {feature.badge}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
