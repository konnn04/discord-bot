export function FeaturesSection() {
  const features = [
    {
      badge: "AI",
      badgeClass: "bg-primary text-primary-foreground",
      subBadge: "có bộ nhớ",
      title: "Chatbot AI đa provider",
      desc: "Gemini, DeepSeek hoặc endpoint OpenAI-compatible của riêng bạn. Bot đọc ảnh, nhớ chuyện cũ và chỉ gọi được đúng những tool bạn cho phép.",
      highlight: true,
    },
    {
      badge: "♪",
      badgeClass: "bg-muted text-foreground",
      title: "Music player + web player",
      desc: "Phát nhạc trong voice, điều khiển hàng chờ realtime qua Socket.IO ngay trên trình duyệt. Có lịch sử nghe để gợi ý bài.",
    },
    {
      badge: "XP",
      badgeClass: "bg-muted text-foreground",
      title: "XP, level & role rank",
      desc: "Tính XP theo chat và thời gian voice, gom lại ghi mỗi 30 giây nên không nặng DB. Tự cấp role khi lên mốc, rank card render sẵn thành ảnh.",
    },
    {
      badge: "GC",
      badgeClass: "bg-muted text-foreground",
      subBadge: "10 game",
      title: "Giftcode tự động",
      desc: "HoYoverse (Genshin, HSR, HI3, ZZZ, ToT) qua API; Wuthering Waves, NTE, Arknights, Endfield, WWM qua crawler. Ping đúng role từng game.",
    },
    {
      badge: "TTS",
      badgeClass: "bg-muted text-foreground",
      title: "Đọc chat trong voice",
      desc: "Ai đang cày game vẫn nghe được tin nhắn kênh chat bằng giọng Việt/Anh tự nhiên với lệnh /speak.",
    },
    {
      badge: "MTG",
      badgeClass: "bg-muted text-foreground",
      title: "Báo cáo họp voice",
      desc: "Chấm công ai vào, ai ra, ngồi bao lâu. Xuất link báo cáo công khai cho cả team xem, không cần login.",
    },
    {
      badge: "WLC",
      badgeClass: "bg-muted text-foreground",
      title: "Chào mừng bằng ảnh",
      desc: "Ảnh chào có avatar và tên thành viên mới, render ngay trên backend. Hoặc dùng text/embed tuỳ chỉnh nếu muốn gọn.",
    },
    {
      badge: "MOD",
      badgeClass: "bg-muted text-foreground",
      title: "Moderation & presence",
      desc: "Kick, ban, timeout, log channel, theo dõi hoạt động thành viên, confession ẩn danh và API presence công khai kiểu Lanyard.",
    },
  ];

  return (
    <section id="tinh-nang" className="scroll-mt-20 py-12 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-md text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl leading-tight dark:text-stone-100">
            Mọi thứ server cần, không cần 6 con bot
          </h2>
          <p className="max-w-md text-sm text-stone-600 leading-relaxed dark:text-stone-400">
            Mỗi tính năng bật/tắt riêng theo từng server. Cấu hình lưu
            PostgreSQL, đọc từ cache trong bộ nhớ nên phản hồi tức thì.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border p-5 transition-all ${
                f.highlight
                  ? "border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent text-stone-900 shadow-sm hover:border-primary/70 dark:text-stone-100"
                  : "border-stone-200/80 bg-white text-stone-900 shadow-xs hover:border-primary/40 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-100"
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${f.badgeClass}`}
                >
                  {f.badge}
                </span>
                {f.subBadge && (
                  <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] text-purple-600 dark:text-purple-300">
                    {f.subBadge}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {f.title}
              </h3>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed dark:text-stone-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
