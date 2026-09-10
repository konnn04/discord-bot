import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon } from "lucide-react";

interface Props {
  readImages: boolean;
  compressImages: boolean;
  onChangeReadImages: (val: boolean) => void;
  onChangeCompressImages: (val: boolean) => void;
}

export function VisionSection({
  readImages,
  compressImages,
  onChangeReadImages,
  onChangeCompressImages,
}: Props) {
  return (
    <div className="space-y-4 rounded-xl border p-4 bg-card/60">
      <div className="space-y-1">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
            5
          </span>
          <ImageIcon className="h-4 w-4 text-primary" />
          Thị giác AI & Xử lý Hình ảnh (Vision & Multimodal)
        </Label>
        <p className="text-xs text-muted-foreground">
          Cho phép bot đọc, phân tích hình ảnh được tải lên hoặc đính kèm trong tin
          nhắn reply trên Discord.
        </p>
      </div>

      <div className="space-y-3 pt-1">
        {/* Toggle Read Images */}
        <div className="flex items-center justify-between gap-4 rounded-xl border p-3.5 bg-background/50">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">
                Nhận diện & Phân tích hình ảnh (Vision)
              </Label>
              <Badge
                variant="outline"
                className="text-[10px] border-primary/30 text-primary"
              >
                Multimodal
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Khi thành viên gửi kèm ảnh hoặc reply tin nhắn có ảnh, bot sẽ xem
              và trả lời theo nội dung bức ảnh.
            </p>
          </div>
          <Switch
            checked={readImages}
            onCheckedChange={onChangeReadImages}
          />
        </div>

        {/* Toggle Compress Images */}
        <div
          className={`flex items-center justify-between gap-4 rounded-xl border p-3.5 transition-opacity ${
            readImages ? "bg-background/50" : "opacity-50 pointer-events-none"
          }`}
        >
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">
                Tự động nén & tối ưu ảnh trước khi gửi (Image Compression)
              </Label>
              <Badge
                variant="secondary"
                className="text-[10px] text-emerald-600 dark:text-emerald-400"
              >
                Khuyên dùng
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Tự động nén ảnh chất lượng cao và giới hạn kích thước tối đa 1280px
              (giảm từ 5-10MB xuống ~80KB). Giúp bot phản hồi siêu nhanh và tiết
              kiệm quota token/băng thông.
            </p>
          </div>
          <Switch
            checked={compressImages}
            disabled={!readImages}
            onCheckedChange={onChangeCompressImages}
          />
        </div>
      </div>
    </div>
  );
}
