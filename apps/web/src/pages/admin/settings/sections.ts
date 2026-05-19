import type { LucideIcon } from "lucide-react";
import {
  MessageSquareText,
  Bell,
  Settings2,
  Gamepad2,
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
    id: "michosgc",
    label: "Game Roles",
    icon: Gamepad2,
    description: "Genshin, HSR, Honkai 3rd, NAP, ToT",
  },
];
