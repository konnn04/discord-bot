import { GITHUB_REPO } from "@/lib/constants";

export function SourceCodeSection() {
  const stack = [
    "NestJS 11",
    "Prisma · PostgreSQL",
    "React 19 · Vite 7",
    "Socket.IO",
    "Docker",
    "@napi-rs/canvas",
  ];

  return (
    <section className="border-t border-stone-200 bg-gradient-to-b from-[#ff5c26]/[0.06] to-transparent py-16 lg:py-24 dark:border-stone-800">
      <div className="container mx-auto px-4 text-center sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl lg:text-5xl dark:text-stone-100">
          Thêm vào server, hoặc tự deploy
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-stone-600 sm:text-base leading-relaxed dark:text-stone-400">
          FoxyBot là mã nguồn mở: NestJS 11 + Prisma + PostgreSQL cho backend,
          React 19 + Vite 7 cho dashboard, chạy được bằng một lệnh docker
          compose.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href="https://discord.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#ff5c26] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#ff7a45]"
          >
            Thêm vào Discord
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-900 shadow-xs transition-colors hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:text-stone-100 dark:hover:bg-white/10"
          >
            Xem trên GitHub
          </a>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {stack.map((item, idx) => (
            <span
              key={idx}
              className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1 font-mono text-xs text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-400"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
