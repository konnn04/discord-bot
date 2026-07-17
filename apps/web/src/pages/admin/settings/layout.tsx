import { useEffect, useState } from "react";
import { Outlet, useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { GuildSettings } from "shared/src/types/settings.types";
import {
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

import { SETTINGS_SECTIONS } from "./sections";

export function GuildSettingsLayout() {
  const { guildId } = useParams<{ guildId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const currentSection = location.pathname.split("/").pop() || "welcome";

  const [data, setData] = useState<GuildSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;
    api
      .get<GuildSettings>(API_ROUTES.GUILD_SETTINGS(guildId))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/${guildId}/dashboard`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Cài đặt Server</h1>
          <p className="text-sm text-muted-foreground">Tùy chỉnh bot theo ý bạn</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Side nav */}
        <Card className="h-fit p-2">
          <nav className="flex flex-col gap-1">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = currentSection === section.id;
              return (
                <Link
                  key={section.id}
                  to={`/admin/${guildId}/settings/${section.id}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{section.label}</p>
                    <p className="truncate text-xs text-muted-foreground/70">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                      isActive ? "rotate-90" : ""
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </Card>

        {/* Content */}
        <div className="min-w-0">
          <Outlet context={{ data, setData, guildId }} />
        </div>
      </div>
    </div>
  );
}
