import type { WelcomeEmbedConfig } from "shared/src/types/settings.types";

export const DISCORD_PRESET_COLORS = [
  { label: "Blurple", value: "#5865F2" },
  { label: "Xanh lá", value: "#57F287" },
  { label: "Vàng", value: "#FEE75C" },
  { label: "Hồng", value: "#EB459E" },
  { label: "Đỏ", value: "#ED4245" },
  { label: "Xanh dương", value: "#00B0F4" },
  { label: "Ngọc bích", value: "#1ABC9C" },
  { label: "Xám tối", value: "#4E5058" },
];

export const PLACEHOLDER_TAGS = [
  { tag: "{user}", desc: "Username" },
  { tag: "{displayName}", desc: "Tên hiển thị" },
  { tag: "{user.mention}", desc: "Tag người dùng" },
  { tag: "{server}", desc: "Tên Server" },
  { tag: "{memberCount}", desc: "Số thứ tự TV" },
];

export function simulatePlaceholders(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/\{user\}/g, "NguyenVanA")
    .replace(/\{displayName\}/g, "Nguyễn Văn A")
    .replace(/\{user\.mention\}/g, "@Nguyễn Văn A")
    .replace(/\{server\}/g, "Cộng Đồng Foxy")
    .replace(/\{memberCount\}/g, "1,452");
}

export const DEFAULT_WELCOME_EMBED: WelcomeEmbedConfig = {
  title: "🎉 Thành viên mới gia nhập!",
  titleUrl: null,
  description:
    "Chào mừng {user.mention} đã đến với **{server}**!\nChúc bạn có những giây phút vui vẻ cùng mọi người.",
  color: "#5865F2",
  authorName: "{server}",
  authorIconUrl: null,
  authorUrl: null,
  thumbnailUrl: null,
  useMemberAvatarAsThumbnail: true,
  imageUrl: null,
  footerText: "Thành viên thứ #{memberCount}",
  footerIconUrl: null,
  timestamp: true,
  fields: [],
};

export const DEFAULT_WELCOME_DM_EMBED: WelcomeEmbedConfig = {
  title: "🎉 Chào mừng bạn!",
  titleUrl: null,
  description:
    "Cảm ơn bạn đã tham gia **{server}**! Chúc bạn có trải nghiệm vui vẻ.",
  color: "#5865F2",
  authorName: "{server}",
  authorIconUrl: null,
  authorUrl: null,
  thumbnailUrl: null,
  useMemberAvatarAsThumbnail: false,
  imageUrl: null,
  footerText: null,
  footerIconUrl: null,
  timestamp: false,
  fields: [],
};
