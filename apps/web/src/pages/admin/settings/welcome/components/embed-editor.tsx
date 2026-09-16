import {
  Sparkles,
  Palette,
  Plus,
  Trash2,
  Image as ImageIcon,
  User,
  Hash,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  WelcomeEmbedConfig,
  WelcomeEmbedField,
} from "shared/src/types/settings.types";
import {
  DISCORD_PRESET_COLORS,
  PLACEHOLDER_TAGS,
  simulatePlaceholders,
} from "../constants";

interface WelcomeEmbedEditorProps {
  embed: WelcomeEmbedConfig;
  onChange: (patch: Partial<WelcomeEmbedConfig>) => void;
}

/** Shared rich-embed form builder + live Discord message preview, reused by
 * both the channel welcome embed and the welcome DM embed. */
export function WelcomeEmbedEditor({
  embed,
  onChange,
}: WelcomeEmbedEditorProps) {
  const addField = () => {
    const currentFields = embed.fields ?? [];
    if (currentFields.length >= 25) return;
    const newField: WelcomeEmbedField = {
      name: "Quy tắc chung",
      value: "Hãy đọc kênh #rules trước khi trò chuyện nhé!",
      inline: false,
    };
    onChange({ fields: [...currentFields, newField] });
  };

  const updateField = (index: number, patch: Partial<WelcomeEmbedField>) => {
    const currentFields = [...(embed.fields ?? [])];
    if (!currentFields[index]) return;
    currentFields[index] = { ...currentFields[index], ...patch };
    onChange({ fields: currentFields });
  };

  const removeField = (index: number) => {
    const currentFields = (embed.fields ?? []).filter((_, i) => i !== index);
    onChange({ fields: currentFields });
  };

  const insertPlaceholder = (tag: string) => {
    const currentDesc = embed.description ?? "";
    onChange({ description: currentDesc ? `${currentDesc} ${tag}` : tag });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Left Column: Embed Form Builder */}
      <div className="space-y-5 xl:col-span-7">
        {/* Color Picker */}
        <div className="rounded-xl border p-4 space-y-3">
          <Label className="flex items-center gap-1.5 font-semibold">
            <Palette className="h-4 w-4 text-primary" />
            Màu viền Embed
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            {DISCORD_PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => onChange({ color: c.value })}
                className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                  embed.color?.toLowerCase() === c.value.toLowerCase()
                    ? "border-white ring-2 ring-primary"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
            <div className="flex items-center gap-2 pl-2">
              <input
                type="color"
                value={embed.color || "#5865F2"}
                onChange={(e) => onChange({ color: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
              />
              <Input
                className="h-8 w-28 font-mono text-xs"
                placeholder="#5865F2"
                value={embed.color || ""}
                onChange={(e) => onChange({ color: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Author Info */}
        <div className="rounded-xl border p-4 space-y-3">
          <Label className="flex items-center gap-1.5 font-semibold">
            <User className="h-4 w-4 text-primary" />
            Tác giả (Author)
          </Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground">Tên tác giả</span>
              <Input
                placeholder="Ví dụ: {server} hoặc Chào mừng bạn!"
                value={embed.authorName ?? ""}
                onChange={(e) =>
                  onChange({ authorName: e.target.value || null })
                }
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                URL Icon tác giả
              </span>
              <Input
                placeholder="https://..."
                value={embed.authorIconUrl ?? ""}
                onChange={(e) =>
                  onChange({ authorIconUrl: e.target.value || null })
                }
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                URL liên kết tác giả
              </span>
              <Input
                placeholder="https://..."
                value={embed.authorUrl ?? ""}
                onChange={(e) =>
                  onChange({ authorUrl: e.target.value || null })
                }
              />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div className="rounded-xl border p-4 space-y-3">
          <Label className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Tiêu đề & Nội dung
          </Label>
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Tiêu đề Embed (Title)
              </span>
              <Input
                placeholder="Chào mừng thành viên mới!"
                value={embed.title ?? ""}
                onChange={(e) => onChange({ title: e.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                URL liên kết tiêu đề
              </span>
              <Input
                placeholder="https://..."
                value={embed.titleUrl ?? ""}
                onChange={(e) => onChange({ titleUrl: e.target.value || null })}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">
                Nội dung chi tiết (Description - hỗ trợ Markdown)
              </span>
              <Textarea
                rows={4}
                placeholder="Chào mừng {user.mention} đến với {server}..."
                value={embed.description ?? ""}
                onChange={(e) =>
                  onChange({ description: e.target.value || null })
                }
              />
              {/* Placeholder chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground mr-1">
                  Chèn nhanh:
                </span>
                {PLACEHOLDER_TAGS.map((t) => (
                  <Badge
                    key={t.tag}
                    variant="outline"
                    className="cursor-pointer text-xs transition-colors hover:bg-primary/20"
                    onClick={() => insertPlaceholder(t.tag)}
                  >
                    {t.tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fields Section */}
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 font-semibold">
              <Hash className="h-4 w-4 text-primary" />
              Các trường thông tin (Fields - {(embed.fields ?? []).length}/25)
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addField}
              className="h-8 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm trường
            </Button>
          </div>

          {(embed.fields ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              Chưa có trường thông tin nào. Bấm "Thêm trường" để tạo các mục như
              Luật server, Kênh thông báo, v.v.
            </p>
          ) : (
            <div className="space-y-3 pt-1">
              {(embed.fields ?? []).map((field, idx) => (
                <div
                  key={idx}
                  className="relative space-y-2 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Trường #{idx + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Switch
                          checked={Boolean(field.inline)}
                          onCheckedChange={(inline) =>
                            updateField(idx, { inline })
                          }
                          className="scale-75"
                        />
                        Cùng dòng (Inline)
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => removeField(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    placeholder="Tên trường (Field Name)"
                    className="h-8 text-xs font-medium"
                    value={field.name}
                    onChange={(e) => updateField(idx, { name: e.target.value })}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Nội dung (Field Value)"
                    className="text-xs"
                    value={field.value}
                    onChange={(e) =>
                      updateField(idx, { value: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Images & Visuals */}
        <div className="rounded-xl border p-4 space-y-3">
          <Label className="flex items-center gap-1.5 font-semibold">
            <ImageIcon className="h-4 w-4 text-primary" />
            Hình ảnh & Thumbnail
          </Label>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">
                  Dùng Avatar của thành viên làm Thumbnail
                </span>
                <p className="text-xs text-muted-foreground">
                  Tự động hiển thị ảnh đại diện của người mới vào ở góc trên bên
                  phải
                </p>
              </div>
              <Switch
                checked={embed.useMemberAvatarAsThumbnail !== false}
                onCheckedChange={(checked) =>
                  onChange({ useMemberAvatarAsThumbnail: checked })
                }
              />
            </div>

            {embed.useMemberAvatarAsThumbnail === false && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  URL Thumbnail tùy chỉnh
                </span>
                <Input
                  placeholder="https://..."
                  value={embed.thumbnailUrl ?? ""}
                  onChange={(e) =>
                    onChange({ thumbnailUrl: e.target.value || null })
                  }
                />
              </div>
            )}

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                URL Banner lớn (Image)
              </span>
              <Input
                placeholder="https://... (Hình ảnh lớn hiển thị phía dưới)"
                value={embed.imageUrl ?? ""}
                onChange={(e) => onChange({ imageUrl: e.target.value || null })}
              />
            </div>
          </div>
        </div>

        {/* Footer & Timestamp */}
        <div className="rounded-xl border p-4 space-y-3">
          <Label className="font-semibold">
            Chân trang (Footer) & Thời gian
          </Label>
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Nội dung Footer
              </span>
              <Input
                placeholder="Thành viên thứ #{memberCount}"
                value={embed.footerText ?? ""}
                onChange={(e) =>
                  onChange({ footerText: e.target.value || null })
                }
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                URL Icon Footer
              </span>
              <Input
                placeholder="https://..."
                value={embed.footerIconUrl ?? ""}
                onChange={(e) =>
                  onChange({ footerIconUrl: e.target.value || null })
                }
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium">
                Hiển thị mốc thời gian (Timestamp)
              </span>
              <Switch
                checked={embed.timestamp !== false}
                onCheckedChange={(timestamp) => onChange({ timestamp })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Live Discord Message Preview */}
      <div className="xl:col-span-5">
        <div className="sticky top-6 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Xem trước giao diện Discord (Live Preview)
            </Label>
            <Badge
              variant="outline"
              className="text-[11px] text-primary border-primary/30"
            >
              Thời gian thực
            </Badge>
          </div>

          {/* Discord Mock Container */}
          <Card className="rounded-xl bg-[#313338] p-4 text-white shadow-2xl border border-[#232428] font-sans antialiased select-none">
            {/* Discord Message Header */}
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-[#5865F2] flex items-center justify-center font-bold text-white shadow">
                🦊
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm hover:underline cursor-pointer">
                    FoxyBot
                  </span>
                  <span className="rounded bg-[#5865F2] px-1 py-0.2 text-[10px] font-bold uppercase tracking-wider text-white">
                    BOT
                  </span>
                  <span className="text-xs text-[#949BA4] ml-1">
                    Hôm nay lúc 12:00
                  </span>
                </div>

                {/* Ping line */}
                <p className="mt-1 text-sm text-[#DBDEE1]">
                  👋{" "}
                  <span className="bg-[#5865F2]/20 text-[#C9CDFB] px-1 py-0.5 rounded font-medium">
                    @Nguyễn Văn A
                  </span>
                </p>

                {/* Discord Embed Box */}
                <div
                  className="mt-2.5 max-w-[500px] rounded-md bg-[#2B2D31] p-3.5 border-l-4 shadow-sm"
                  style={{ borderLeftColor: embed.color || "#5865F2" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      {/* Author */}
                      {embed.authorName && (
                        <div className="flex items-center gap-2">
                          {embed.authorIconUrl ? (
                            <img
                              src={embed.authorIconUrl}
                              alt=""
                              className="h-5 w-5 rounded-full object-cover"
                              onError={(e) =>
                                (e.currentTarget.style.display = "none")
                              }
                            />
                          ) : null}
                          <span className="text-xs font-bold text-white hover:underline">
                            {simulatePlaceholders(embed.authorName)}
                          </span>
                        </div>
                      )}

                      {/* Title */}
                      {embed.title && (
                        <h4 className="text-base font-bold leading-snug">
                          {embed.titleUrl ? (
                            <a
                              href={embed.titleUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#00A8FC] hover:underline flex items-center gap-1 inline-flex"
                            >
                              {simulatePlaceholders(embed.title)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            simulatePlaceholders(embed.title)
                          )}
                        </h4>
                      )}

                      {/* Description */}
                      {embed.description && (
                        <p className="whitespace-pre-line text-sm text-[#DBDEE1] leading-relaxed">
                          {simulatePlaceholders(embed.description)}
                        </p>
                      )}
                    </div>

                    {/* Thumbnail */}
                    {embed.useMemberAvatarAsThumbnail !== false ? (
                      <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-xl font-bold shadow-md">
                        👤
                      </div>
                    ) : embed.thumbnailUrl ? (
                      <img
                        src={embed.thumbnailUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg object-cover shadow-md"
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                    ) : null}
                  </div>

                  {/* Embed Fields */}
                  {(embed.fields ?? []).length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {(embed.fields ?? []).map((f, i) => (
                        <div
                          key={i}
                          className={f.inline ? "col-span-1" : "col-span-full"}
                        >
                          <div className="text-xs font-bold text-[#B5BAC1]">
                            {simulatePlaceholders(f.name)}
                          </div>
                          <div className="text-xs text-[#DBDEE1] mt-0.5 whitespace-pre-line leading-relaxed">
                            {simulatePlaceholders(f.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Banner Image */}
                  {embed.imageUrl && (
                    <div className="mt-3 overflow-hidden rounded-md border border-[#383A40]">
                      <img
                        src={embed.imageUrl}
                        alt=""
                        className="max-h-56 w-full object-cover"
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                    </div>
                  )}

                  {/* Footer */}
                  {(embed.footerText || embed.timestamp !== false) && (
                    <div className="mt-3 flex items-center gap-2 pt-1 text-[11px] text-[#949BA4]">
                      {embed.footerIconUrl && (
                        <img
                          src={embed.footerIconUrl}
                          alt=""
                          className="h-4 w-4 rounded-full object-cover"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                      )}
                      <span>
                        {simulatePlaceholders(embed.footerText)}
                        {embed.footerText && embed.timestamp !== false
                          ? " • "
                          : ""}
                        {embed.timestamp !== false ? "Hôm nay lúc 12:00" : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
