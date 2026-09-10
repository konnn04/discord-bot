export function CommandsSection() {
  const commands = [
    { cmd: "/play", desc: "phát nhạc vào kênh thoại" },
    { cmd: "/rank", desc: "xem rank card của bạn" },
    { cmd: "/top", desc: "bảng xếp hạng tháng" },
    { cmd: "/speak", desc: "bật đọc chat bằng giọng nói" },
    { cmd: "/giftcode", desc: "tra code còn hiệu lực" },
    { cmd: "/meeting", desc: "mở phiên chấm công họp" },
    { cmd: "/memory", desc: "xem bot đang nhớ gì" },
    { cmd: "/anime", desc: "theo dõi lịch ra tập mới" },
  ];

  return (
    <section id="lenh" className="scroll-mt-20 py-10 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="rounded-3xl border border-stone-200 bg-stone-50/60 p-6 sm:p-8 dark:border-stone-800 dark:bg-stone-900/40">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-xl font-extrabold tracking-tight text-stone-900 sm:text-2xl dark:text-stone-100">
              Lệnh dùng nhiều nhất
            </h2>
            <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
              còn hơn 40 lệnh khác trong{" "}
              <span className="font-semibold text-[#ff5c26]">/help</span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {commands.map((c, idx) => (
              <div
                key={idx}
                className="flex items-baseline gap-3 rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-xs dark:border-stone-800/80 dark:bg-stone-950/60"
              >
                <code className="font-mono text-xs font-bold text-[#ff5c26]">
                  {c.cmd}
                </code>
                <span className="text-xs text-stone-600 dark:text-stone-400">
                  {c.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
