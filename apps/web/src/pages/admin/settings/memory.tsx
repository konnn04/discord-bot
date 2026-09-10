import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import {
  Brain,
  Sparkles,
  Plus,
  Search,
  Trash2,
  Edit3,
  RefreshCw,
  Cpu,
  UserCheck,
  Send,
  Copy,
  Check,
  Calendar,
  Layers,
  Wand2,
  Loader2,
} from "lucide-react";

export interface MemoryEntry {
  key: string;
  value: string;
  metadata?: {
    source?: "ai" | "manual";
    authorId?: string;
    authorName?: string;
    channelId?: string;
    updatedBy?: string;
    [key: string]: unknown;
  };
  updatedAt?: string;
}

interface MemoryListResponse {
  items: MemoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

interface MemoryStats {
  total: number;
  aiCount: number;
  manualCount: number;
}

export function MemorySettings() {
  const { guildId } = useOutletContext<{ guildId: string }>();

  // State
  const [items, setItems] = useState<MemoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "ai" | "manual">("all");
  const [stats, setStats] = useState<MemoryStats>({ total: 0, aiCount: 0, manualCount: 0 });

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [formKey, setFormKey] = useState("");
  const [formValue, setFormValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Copied indicator
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Simulator state
  const [showSimulator, setShowSimulator] = useState(false);
  const [simQuery, setSimQuery] = useState("");
  const [simResults, setSimResults] = useState<MemoryEntry[] | null>(null);
  const [simulating, setSimulating] = useState(false);

  // AI prompt-to-memory chat state
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const [promptSending, setPromptSending] = useState(false);
  const [chatLog, setChatLog] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await api.get<MemoryStats>(API_ROUTES.GUILD_MEMORY_STATS(guildId));
      if (res) setStats(res);
    } catch {
      // stats fallback
    }
  }, [guildId]);

  // Fetch memories
  const fetchMemories = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await api.get<MemoryListResponse>(
        API_ROUTES.GUILD_MEMORIES(guildId, {
          search: search.trim() || undefined,
          source: sourceFilter,
          page: 1,
          pageSize: 100,
        })
      );
      if (res && Array.isArray(res.items)) {
        setItems(res.items);
        setTotal(res.total);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch {
      toast.error("Không thể tải danh sách bộ nhớ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [guildId, search, sourceFilter]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchMemories(), fetchStats()]);
    }
    load();
  }, [fetchMemories, fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMemories();
    fetchStats();
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setDialogMode("create");
    setFormKey("");
    setFormValue("");
    setIsDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (entry: MemoryEntry) => {
    setDialogMode("edit");
    setFormKey(entry.key);
    setFormValue(entry.value);
    setIsDialogOpen(true);
  };

  // Submit Create or Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = formKey.trim().toLowerCase();
    const cleanVal = formValue.trim();

    if (!cleanKey || !cleanVal) {
      toast.error("Vui lòng điền đầy đủ Key và Nội dung");
      return;
    }

    setSaving(true);
    try {
      if (dialogMode === "create") {
        await api.post(API_ROUTES.GUILD_MEMORIES(guildId), {
          key: cleanKey,
          value: cleanVal,
        });
        toast.success(`Đã thêm ký ức cho "${cleanKey}"`);
      } else {
        await api.put(API_ROUTES.GUILD_MEMORY(guildId, cleanKey), {
          value: cleanVal,
        });
        toast.success(`Đã cập nhật ký ức "${cleanKey}"`);
      }
      setIsDialogOpen(false);
      fetchMemories();
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingKey) return;
    setDeleting(true);
    try {
      await api.delete(API_ROUTES.GUILD_MEMORY(guildId, deletingKey));
      toast.success(`Đã xóa ký ức "${deletingKey}"`);
      setDeletingKey(null);
      fetchMemories();
      fetchStats();
    } catch {
      toast.error("Xóa thất bại");
    } finally {
      setDeleting(false);
    }
  };

  // Copy Key to Clipboard
  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Run Simulator Lookup
  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simQuery.trim()) return;
    setSimulating(true);
    try {
      const res = await api.post<{ query: string; matched: MemoryEntry[] }>(
        API_ROUTES.GUILD_MEMORY_TEST(guildId),
        { query: simQuery.trim() }
      );
      setSimResults(res?.matched || []);
    } catch {
      toast.error("Kiểm tra ngữ cảnh thất bại");
    } finally {
      setSimulating(false);
    }
  };

  // Send a free-text prompt — AI extracts facts and saves them as memories
  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = promptInput.trim();
    if (!text || promptSending) return;

    setChatLog((prev) => [...prev, { role: "user", text }]);
    setPromptInput("");
    setPromptSending(true);
    try {
      const res = await api.post<{
        reply: string;
        created: { key: string; value: string }[];
      }>(API_ROUTES.GUILD_MEMORY_FROM_PROMPT(guildId), { prompt: text });
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: res?.reply || "Đã xử lý." },
      ]);
      if (res?.created?.length) {
        fetchMemories();
        fetchStats();
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Có lỗi xảy ra khi xử lý prompt.";
      setChatLog((prev) => [...prev, { role: "assistant", text: `❌ ${msg}` }]);
    } finally {
      setPromptSending(false);
    }
  };

  // Format Date helper
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return null;
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Stats ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Brain className="h-5 w-5 text-primary" />
            Ký ức AI (Guild Memory)
          </h2>
          <p className="text-sm text-muted-foreground">
            Quản lý các thông tin AI tự học từ hội thoại và các ký ức thủ công của server.
            Ký ức được cách ly 100% theo Server ID.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPromptPanel(!showPromptPanel)}
            className="gap-1.5"
          >
            <Wand2 className="h-4 w-4 text-primary" />
            {showPromptPanel ? "Đóng Chat AI" : "Thêm bằng AI"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSimulator(!showSimulator)}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            {showSimulator ? "Đóng Test" : "Thử Tra cứu"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Thêm Ký ức
          </Button>
        </div>
      </div>

      {/* ── Quick Stats Grid ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tổng Ký ức Lưu Trữ</p>
              <h3 className="text-2xl font-bold tracking-tight">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">AI Tự Học Từ Ngữ Cảnh</p>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-400">
                {stats.aiCount}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Admin Thêm Thủ Công</p>
              <h3 className="text-2xl font-bold tracking-tight text-purple-400">
                {stats.manualCount}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── AI Prompt-to-Memory Chat ── */}
      {showPromptPanel && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Wand2 className="h-4 w-4 text-primary" />
              Thêm Ký ức bằng AI (Prompt)
            </CardTitle>
            <CardDescription className="text-xs">
              Mô tả sự thật cần ghi nhớ bằng ngôn ngữ tự nhiên — AI sẽ tự trích xuất key/value
              và lưu lại, không cần điền tay. Cần Chatbot AI đã được bật và cấu hình cho server này.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {chatLog.length > 0 && (
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-card/80 p-3">
                {chatLog.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-1.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSendPrompt} className="flex gap-2">
              <Input
                placeholder='Ví dụ: "Nhớ rằng konnn là admin, thích lập trình và cà phê"...'
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                disabled={promptSending}
                className="bg-background/80"
              />
              <Button
                type="submit"
                disabled={promptSending || !promptInput.trim()}
                className="gap-1.5 shrink-0"
              >
                {promptSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {promptSending ? "Đang xử lý..." : "Gửi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Simulator / Context Lookup Tester ── */}
      {showSimulator && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Trình kiểm tra tra cứu Ký ức (Memory Lookup Simulator)
            </CardTitle>
            <CardDescription className="text-xs">
              Nhập một câu hỏi hoặc đoạn hội thoại bất kỳ để xem AI sẽ kích hoạt và nạp những ký
              ức nào vào prompt hệ thống.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSimulate} className="flex gap-2">
              <Input
                placeholder="Ví dụ: Konnn là ai? hoặc Ai đang ở phòng voice?..."
                value={simQuery}
                onChange={(e) => setSimQuery(e.target.value)}
                className="bg-background/80"
              />
              <Button type="submit" disabled={simulating || !simQuery.trim()} className="gap-1.5 shrink-0">
                <Send className="h-4 w-4" />
                {simulating ? "Đang dò..." : "Kiểm tra"}
              </Button>
            </form>

            {simResults !== null && (
              <div className="space-y-2 rounded-lg border border-border/70 bg-card/80 p-3 text-sm">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Kết quả khớp ({simResults.length} mục):</span>
                  {simResults.length > 0 && (
                    <span className="text-emerald-400">✓ Các mục này sẽ được inject vào system prompt</span>
                  )}
                </div>
                {simResults.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    Không có ký ức nào khớp với câu hỏi này.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {simResults.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-md border border-border/50 bg-muted/40 p-2.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono font-bold text-primary">
                          <span>#{item.key}</span>
                          <Badge variant="outline" className="text-[10px]">
                            Khớp
                          </Badge>
                        </div>
                        <p className="line-clamp-2 text-muted-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo Key (tên, ID discord, từ khóa) hoặc nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/50"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={sourceFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSourceFilter("all")}
            className="text-xs"
          >
            Tất cả ({total})
          </Button>
          <Button
            variant={sourceFilter === "ai" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSourceFilter("ai")}
            className="text-xs gap-1.5"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            AI học ({stats.aiCount})
          </Button>
          <Button
            variant={sourceFilter === "manual" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSourceFilter("manual")}
            className="text-xs gap-1.5"
          >
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            Thủ công ({stats.manualCount})
          </Button>
        </div>
      </div>

      {/* ── Memories List / Cards ── */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/30 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
            <Brain className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold">Chưa có ký ức nào</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            {search
              ? `Không tìm thấy ký ức nào phù hợp với từ khóa "${search}".`
              : "AI sẽ tự động học các sự thật và thông tin khi thành viên trò chuyện trong server, hoặc bạn có thể tự thêm ký ức thủ công ngay bây giờ."}
          </p>
          {!search && (
            <Button onClick={handleOpenCreate} className="mt-4 gap-1.5" size="sm">
              <Plus className="h-4 w-4" />
              Thêm Ký ức Đầu Tiên
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((entry) => {
            const isAi = entry.metadata?.source === "ai";
            const formattedDate = formatDate(entry.updatedAt);

            return (
              <Card
                key={entry.key}
                className="group relative flex flex-col justify-between border-border/70 bg-card/60 transition-all hover:border-border hover:shadow-md backdrop-blur-sm"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    {/* Key badge */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-sm font-bold text-foreground truncate bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                        #{entry.key}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopy(entry.key)}
                        title="Copy Key"
                      >
                        {copiedKey === entry.key ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                    </div>

                    {/* Source badge */}
                    {isAi ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] gap-1 shrink-0"
                      >
                        <Cpu className="h-3 w-3" />
                        AI Learned
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-purple-500/30 bg-purple-500/10 text-purple-400 text-[11px] gap-1 shrink-0"
                      >
                        <UserCheck className="h-3 w-3" />
                        Thủ công
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 pb-3 flex-1">
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed font-normal">
                    {entry.value}
                  </p>
                </CardContent>

                {/* Footer metadata & actions */}
                <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 truncate">
                    {formattedDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formattedDate}
                      </span>
                    )}
                    {entry.metadata?.authorName && (
                      <span className="truncate">bởi {entry.metadata.authorName}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(entry)}
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeletingKey(entry.key)}
                      title="Xóa ký ức"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Dialog: Create / Edit Memory ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                {dialogMode === "create" ? "Thêm Ký ức Mới" : "Chỉnh sửa Ký ức"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {dialogMode === "create"
                  ? "Ký ức này sẽ được lưu cố định cho Server hiện tại và nạp cho AI khi hội thoại đề cập tới từ khóa."
                  : `Cập nhật nội dung cho từ khóa #${formKey}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Key Field */}
              <div className="space-y-1.5">
                <Label htmlFor="mem-key" className="text-xs font-semibold">
                  Key / Từ khóa định danh <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mem-key"
                  placeholder="Ví dụ: konnn, admin, 1234567890, game_yeu_thich..."
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  disabled={dialogMode === "edit" || saving}
                  className="font-mono text-sm"
                  autoFocus={dialogMode === "create"}
                />
                <p className="text-[11px] text-muted-foreground">
                  Nên dùng chữ thường không dấu hoặc Discord User ID. AI sẽ dùng key này hoặc các từ
                  khóa liên quan để tìm kiếm.
                </p>
              </div>

              {/* Value Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="mem-val" className="text-xs font-semibold">
                    Nội dung Ký ức <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {formValue.length}/1500 ký tự
                  </span>
                </div>
                <Textarea
                  id="mem-val"
                  placeholder="Mô tả sự thật, thông tin hoặc tính cách mà AI cần ghi nhớ..."
                  rows={4}
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  maxLength={1500}
                  disabled={saving}
                  className="resize-none text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={saving || !formKey.trim() || !formValue.trim()}>
                {saving ? "Đang lưu..." : dialogMode === "create" ? "Tạo Ký ức" : "Lưu Thay Đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirm Delete ── */}
      <AlertDialog open={!!deletingKey} onOpenChange={(open) => !open && setDeletingKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Xóa Ký ức này?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa ký ức{" "}
              <strong className="text-foreground font-mono">#{deletingKey}</strong> khỏi máy chủ?
              Sau khi xóa, AI sẽ không còn ghi nhớ sự thật này nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Đang xóa..." : "Xác nhận Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
