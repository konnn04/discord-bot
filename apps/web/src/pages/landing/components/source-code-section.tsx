import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code2, GitFork } from "lucide-react";
import { GITHUB_REPO } from "@/lib/constants";

export function SourceCodeSection() {
  return (
    <section id="source" className="border-t py-24">
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Mã nguồn
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Mã nguồn mở
          </h2>
          <p className="mt-4 text-muted-foreground">
            FoxyBot là dự án mã nguồn mở. Bạn có thể xem code, đóng góp hoặc
            tự deploy phiên bản của riêng mình.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Button variant="outline" size="lg" className="gap-2" asChild>
              <a href={GITHUB_REPO} target="_blank" rel="noreferrer">
                <GitFork className="h-5 w-5" />
                Xem trên GitHub
              </a>
            </Button>
            <Button size="lg" className="gap-2" asChild>
              <a href={GITHUB_REPO} target="_blank" rel="noreferrer">
                <Code2 className="h-5 w-5" />
                Đóng góp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
