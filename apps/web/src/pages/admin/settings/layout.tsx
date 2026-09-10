import { useEffect, useState } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import type { GuildSettings } from "shared/src/types/settings.types";
import { ArrowLeft } from "lucide-react";

export function GuildSettingsLayout() {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();

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
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/admin/${guildId}/dashboard`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Cài đặt Server</h1>
          <p className="text-sm text-muted-foreground">Tùy chỉnh bot theo ý bạn</p>
        </div>
      </div>

      <div className="min-w-0">
        <Outlet context={{ data, setData, guildId }} />
      </div>
    </div>
  );
}

