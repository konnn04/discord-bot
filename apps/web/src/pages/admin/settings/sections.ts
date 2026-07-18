import type { LucideIcon } from "lucide-react";
import {
  MessageSquareText,
  Bell,
  Settings2,
  Gift,
  Trophy,
  Bot,
  Radar,
} from "lucide-react";

export type SettingsSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "welcome",
    label: "Chào mừng",
    icon: MessageSquareText,
    description: "Tin nhắn chào mừng & tạm biệt",
  },
  {
    id: "notifications",
    label: "Thông báo tự động",
    icon: Bell,
    description: "LeetCode, giftcode, voice, XP level up...",
  },
  {
    id: "general",
    label: "Cài đặt chung",
    icon: Settings2,
    description: "Prefix, tính năng, XP, nhạc...",
  },
  {
    id: "rolerank",
    label: "Role theo Level",
    icon: Trophy,
    description: "Tự động cấp role theo mốc level",
  },
  {
    id: "michosgc",
    label: "Giftcode HoYoverse",
    icon: Gift,
    description: "Genshin, HSR, ZZZ... thông báo & tag role",
  },
  {
    id: "giftcode-crawl",
    label: "Giftcode — Game khác",
    icon: Radar,
    description: "NTE, Wuthering Waves, Arknights... cào tự động",
  },
  {
    id: "chatbot",
    label: "Chatbot AI",
    icon: Bot,
    description: "Bot trả lời khi tag & kiểm soát công cụ",
  },
];
