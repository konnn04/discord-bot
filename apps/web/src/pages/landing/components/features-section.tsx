import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Music,
  Bot,
  Shield,
  Volume2,
  BarChart3,
  Trophy,
  Gift,
  MessageSquare,
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
    icon: Bot,
    title: "Chatbot AI",
    description:
      "Trả lời khi được tag, dùng Gemini hoặc DeepSeek. Bạn kiểm soát từng công cụ bot được phép dùng.",
    badge: "Mới",
  },
  {
    icon: Music,
    title: "Music Player",
    description:
      "Phát nhạc từ YouTube, Spotify với giao diện web trực quan. Playlist, queue, lyrics đầy đủ.",
    badge: "Hot",
  },
  {
    icon: Volume2,
    title: "Đọc chat (TTS)",
    description:
      "Bot đọc tin nhắn trong kênh thoại bằng giọng Việt/Anh tự nhiên với /speak.",
    badge: "Mới",
  },
  {
    icon: Trophy,
    title: "XP, Level & Role",
    description:
      "Level theo tin nhắn và voice, bảng xếp hạng, tự cấp role theo mốc level.",
  },
  {
    icon: MessageSquare,
    title: "Chào mừng",
    description:
      "Ảnh chào mừng tạo tự động với avatar và tên thành viên — hoặc text/embed tuỳ chọn.",
  },
  {
    icon: Gift,
    title: "Thông báo Giftcode",
    description:
      "Tự động báo giftcode HoYoverse mới và tag đúng role cho từng game.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Meeting",
    description:
      "Biểu đồ tin nhắn, XP, online. Báo cáo điểm danh cuộc họp qua link web.",
  },
  {
    icon: Shield,
    title: "Moderation",
    description:
      "Kick, ban, timeout, log channel — quản lý toàn bộ qua dashboard web hiện đại.",
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
