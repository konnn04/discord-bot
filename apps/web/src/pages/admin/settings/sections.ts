import type { LucideIcon } from "lucide-react";
import {
  MessageSquareText,
  Bell,
  Settings2,
  Gift,
  Trophy,
  Bot,
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
    label: "Giftcode",
    icon: Gift,
    description: "Thông báo giftcode HoYoverse & tag role",
  },
  {
    id: "chatbot",
    label: "Chatbot AI",
    icon: Bot,
    description: "Bot trả lời khi tag & kiểm soát công cụ",
  },
];
