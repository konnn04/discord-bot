import { Separator } from "@/components/ui/separator";
import { Bot, Heart, GitFork } from "lucide-react";

export function LandingFooter() {
  return (
    <>
      <Separator />
      <footer className="py-10">
        <div className="container mx-auto">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold">FoxyBot</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} FoxyBot. Made with{" "}
              <Heart className="inline h-3.5 w-3.5 text-red-500" /> by <a
                href="https://github.com/konnn04"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Konnn04
              </a>
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/konnn04/discord-bot"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub repository"
              >
                <GitFork className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
