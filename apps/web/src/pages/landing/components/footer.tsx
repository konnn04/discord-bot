import { GITHUB_REPO } from "@/lib/constants";

export function LandingFooter() {
  return (
    <footer className="border-t border-stone-800 bg-[#12100f] py-8 text-xs text-stone-400">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2.5 font-bold text-stone-200">
          <div className="h-5 w-5 rounded-md bg-gradient-to-br from-[#ff7a45] to-[#d63c96]" />
          <span>FoxyBot</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            className="hover:text-stone-200 transition-colors"
          >
            GitHub
          </a>
          <span>© {new Date().getFullYear()} FoxyBot · made by Konnn04</span>
        </div>
      </div>
    </footer>
  );
}
