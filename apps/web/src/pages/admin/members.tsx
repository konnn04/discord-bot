import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import { STATUS_MAP, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { GuildMember } from "@/lib/types";
import { Search, CalendarDays, Clock, Shield, UserX } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface MembersResponse {
  members: GuildMember[];
  total: number;
}

export function MembersPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "humans" | "bots" | "online">("humans");
  const [sort, setSort] = useState<"joined" | "status">("joined");
  const [selectedMember, setSelectedMember] = useState<GuildMember | null>(null);
  const [memberDetail, setMemberDetail] = useState<{
    joinedAt: string;
    roles: string[];
    activity?: string;
  } | null>(null);

  const pageSize = DEFAULT_PAGE_SIZE;
  const queryKey = ["members", guildId, page, pageSize, search, filter, sort] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<MembersResponse> => {
      if (!guildId) return { members: [], total: 0 };
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        filter,
        sort,
      });
      if (search) params.set("search", search);
      return api.get<MembersResponse>(
        `${API_ROUTES.GUILD_MEMBERS(guildId)}?${params}`,
      );
    },
    enabled: !!guildId,
    placeholderData: (prev) => prev,
  });

  const members = data?.members ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleMemberClick = async (member: GuildMember) => {
    setSelectedMember(member);
    if (!guildId) return;
    try {
      const detail = await api.get<{
        joinedAt: string;
        roles: string[];
        activity?: string;
      }>(API_ROUTES.GUILD_MEMBER(guildId, member.id));
      setMemberDetail(detail);
    } catch {
      setMemberDetail(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm thành viên..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={filter}
            onValueChange={(v) => {
              setFilter(v as "all" | "humans" | "bots" | "online");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="humans">Người</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="bots">Bot</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v as "joined" | "status");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="joined">Mới tham gia</SelectItem>
              <SelectItem value="status">Online trước</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Thành viên</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tham gia</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="w-20">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-10 w-10 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1 h-3 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <p className="text-muted-foreground">
                      Không tìm thấy thành viên nào
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => {
                  const status = STATUS_MAP[member.status] || STATUS_MAP.offline;
                  return (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleMemberClick(member)}
                    >
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={
                              member.avatar
                                ? `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png?size=64`
                                : undefined
                            }
                          />
                          <AvatarFallback>
                            {member.displayName?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {member.displayName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {member.username}#0 • {member.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${status.color}`}
                          />
                          <span className="text-sm">{status.label}</span>
                        </div>
                        {member.activity && (
                          <span className="text-xs text-muted-foreground">
                            {member.activity}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.joinedAt
                          ? format(new Date(member.joinedAt), "dd/MM/yyyy")
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.roleNames?.filter((r) => r !== '@everyone').slice(0, 2).map((role) => (
                            <Badge
                              key={role}
                              variant="secondary"
                              className="text-xs"
                            >
                              {role}
                            </Badge>
                          ))}
                          {(member.roleNames?.length || 0) > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.roleNames!.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <UserX className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const p = i + 1;
              return (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(p);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Member Detail Modal */}
      <Dialog
        open={!!selectedMember}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMember(null);
            setMemberDetail(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thông tin thành viên</DialogTitle>
            <DialogDescription>
              Chi tiết về thành viên trong server
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 rounded-xl">
                  <AvatarImage
                    src={
                      selectedMember.avatar
                        ? `https://cdn.discordapp.com/avatars/${selectedMember.id}/${selectedMember.avatar}.png?size=128`
                        : undefined
                    }
                  />
                  <AvatarFallback className="rounded-xl text-xl">
                    {selectedMember.displayName?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">
                    {selectedMember.displayName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    @{selectedMember.username} • {selectedMember.id}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tham gia</p>
                    <p className="text-sm font-medium">
                      {memberDetail?.joinedAt
                        ? formatDistanceToNow(
                            new Date(memberDetail.joinedAt),
                            { addSuffix: true, locale: vi },
                          )
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hoạt động</p>
                    <p className="text-sm font-medium">
                      {memberDetail?.activity || "Không có"}
                    </p>
                  </div>
                </div>
              </div>

              {memberDetail?.roles && memberDetail.roles.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Roles</h4>
                  <div className="flex flex-wrap gap-1">
                    {memberDetail.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={async () => {
                    if (!guildId) return;
                    await api.post(
                      API_ROUTES.GUILD_MEMBER_KICK(guildId, selectedMember.id),
                    );
                    queryClient.invalidateQueries({ queryKey: ["members", guildId] });
                    setSelectedMember(null);
                  }}
                >
                  <UserX className="mr-1.5 h-4 w-4" />
                  Kick
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={async () => {
                    if (!guildId) return;
                    await api.post(
                      API_ROUTES.GUILD_MEMBER_TIMEOUT(guildId, selectedMember.id),
                      { minutes: 60 },
                    );
                    queryClient.invalidateQueries({ queryKey: ["members", guildId] });
                    setSelectedMember(null);
                  }}
                >
                  <Shield className="mr-1.5 h-4 w-4" />
                  Timeout 1h
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
