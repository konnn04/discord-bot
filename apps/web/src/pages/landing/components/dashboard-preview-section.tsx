import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface ToolToggle {
  name: string;
  note: string;
  on: boolean;
}

export function DashboardPreviewSection() {
  const [toggles, setToggles] = useState<ToolToggle[]>([
    { name: "search_memory", note: "tìm trong bộ nhớ", on: true },
    { name: "play_music", note: "phát nhạc", on: true },
    { name: "get_giftcode", note: "tra giftcode", on: true },
    { name: "read_images", note: "đọc ảnh (vision)", on: true },
    { name: "kick_member", note: "rủi ro cao", on: false },
    { name: "rename_voice", note: "rủi ro cao", on: false },
  ]);

  const handleToggle = (index: number) => {
    setToggles((prev) =>
      prev.map((t, i) => (i === index ? { ...t, on: !t.on } : t)),
    );
  };

  return (
    <section id="dashboard" className="scroll-mt-20 py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Text */}
          <div className="lg:col-span-6">
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-[#ff5c26]">
              Dashboard web
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl leading-tight dark:text-stone-100">
              Bạn quyết định bot được làm gì
            </h2>
            <p className="mt-4 text-base text-stone-600 leading-relaxed dark:text-stone-400">
              Đăng nhập bằng Discord, chọn server, bật từng tính năng. Chatbot
              chỉ nhận đúng những tool bạn tick — các tool rủi ro như kick hay
              đổi nickname mặc định tắt.
            </p>
            <div className="mt-8">
              <Link
                to="/admin"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-100 px-6 py-3.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-200 dark:border-white/15 dark:bg-white/5 dark:text-stone-100 dark:hover:bg-white/10"
              >
                Mở Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right Card Mockup */}
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1715] shadow-xl">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-white/10 p-4">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#ff7a45] to-[#d63c96]" />
                <div className="text-sm font-bold text-stone-100">
                  Chatbot · tool được phép
                </div>
                <div className="ml-auto font-mono text-[11px] text-stone-400">
                  gemini-flash-lite
                </div>
              </div>

              {/* Toggles list */}
              <div className="space-y-1 p-3">
                {toggles.map((tg, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleToggle(idx)}
                    className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
                  >
                    <code className="font-mono text-xs text-stone-200">
                      {tg.name}
                    </code>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-stone-400">{tg.note}</span>
                      <div
                        className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                          tg.on ? "bg-[#ff5c26]" : "bg-white/15"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full transition-transform ${
                            tg.on
                              ? "translate-x-4 bg-stone-950"
                              : "translate-x-0 bg-stone-400"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
