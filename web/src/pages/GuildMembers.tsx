import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Shield, ShieldAlert, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Role {
    id: string;
    name: string;
    color: string;
}

interface Activity {
    type: number;
    name: string;
    details?: string;
    state?: string;
}

interface Member {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string;
    roles: Role[];
    joinedAt: string;
    status: string;
    activities?: Activity[];
}

// Helper for status priority
const statusPriority: Record<string, number> = {
    'online': 1,
    'dnd': 2,
    'idle': 3,
    'offline': 4
};

export default function GuildMembers() {
    const { guildId } = useParams();
    const navigate = useNavigate();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);

    // Pagination & Sort
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    useEffect(() => {
        const fetchMembers = async () => {
             try {
                 const data = await api.fetch<Member[]>(`/guilds/${guildId}/members`);
                 setMembers(data);
             } catch (err) {
                 console.error(err);
                 toast.error("Failed to load members");
             } finally {
                 setLoading(false);
             }
        };
        fetchMembers();
    }, [guildId]);

    // Filter
    const filteredMembers = members.filter(m => 
        m.username.toLowerCase().includes(search.toLowerCase()) || 
        (m.globalName && m.globalName.toLowerCase().includes(search.toLowerCase()))
    );

    // Sort
    const sortedMembers = [...filteredMembers].sort((a, b) => {
        // Primary: Status
        const statusA = statusPriority[a.status] || 5;
        const statusB = statusPriority[b.status] || 5;
        if (statusA !== statusB) return statusA - statusB;
        
        // Secondary: Name
        return (a.globalName || a.username).localeCompare(b.globalName || b.username);
    });

    // Paginate
    const totalPages = Math.ceil(sortedMembers.length / itemsPerPage);
    const paginatedMembers = sortedMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleAction = async (action: 'kick' | 'timeout') => {
        if (!selectedMember) return;
        
        try {
            if (action === 'kick') {
                if (!confirm(`Are you sure you want to kick ${selectedMember.username}?`)) return;
                await api.post(`/guilds/${guildId}/members/${selectedMember.id}/kick`, { reason: "Kicked via Dashboard" });
                toast.success(`Kicked ${selectedMember.username}`);
            } else {
                await api.post(`/guilds/${guildId}/members/${selectedMember.id}/timeout`, { duration: 3600, reason: "Timeout via Dashboard" });
                toast.success(`Timed out ${selectedMember.username} for 1 hour`);
            }
            setSelectedMember(null);
        } catch (err: unknown) {
             console.error(err);
             const error = err as { error?: string };
             toast.error(error.error || "Action failed");
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/guilds/${guildId}`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Members</h2>
                        <p className="text-muted-foreground">{members.length} members found</p>
                    </div>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search members..." 
                        className="pl-8" 
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center p-8 text-muted-foreground">Loading members...</div>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                                    <TableHead>Activity</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedMembers.map((member) => (
                                    <TableRow key={member.id} className="cursor-pointer" onClick={() => setSelectedMember(member)}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                 <Avatar>
                                                    <AvatarImage src={member.avatar} />
                                                    <AvatarFallback>{member.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-bold">{member.globalName || member.username}</div>
                                                    <div className="text-xs text-muted-foreground">@{member.username}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    member.status === 'online' ? 'bg-green-500' : 
                                                    member.status === 'dnd' ? 'bg-red-500' :
                                                    member.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-500'
                                                }`} />
                                                <span className="capitalize text-sm text-muted-foreground">{member.status}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {new Date(member.joinedAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {member.activities && member.activities.length > 0 ? (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                     {member.activities[0].type === 0 && <span className="text-green-500">Playing</span>}
                                                     {member.activities[0].type === 2 && <span className="text-emerald-500">Listening</span>}
                                                     <span className="truncate max-w-[150px]">{member.activities[0].name}</span>
                                                     {member.activities.length > 1 && <Badge variant="outline" className="text-[10px] h-5">+{member.activities.length - 1}</Badge>}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedMember(member); }}>
                                                Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {paginatedMembers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No members found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                         <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <div className="text-sm font-medium">Page {currentPage} of {totalPages}</div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            )}
            
            <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Member Details</DialogTitle>
                    </DialogHeader>
                    {selectedMember && (
                        <div className="space-y-6 mt-4">
                            <div className="flex items-center space-x-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={selectedMember.avatar} />
                                    <AvatarFallback>{selectedMember.username}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-xl font-bold">{selectedMember.globalName}</h3>
                                    <p className="text-muted-foreground">@{selectedMember.username}</p>
                                    <p className="text-xs text-muted-foreground mt-1">ID: {selectedMember.id}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Roles</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedMember.roles
                                        .filter(r => r.name !== '@everyone')
                                        .map(r => (
                                        <Badge 
                                            key={r.id} 
                                            variant="secondary"
                                            style={{ color: r.color !== '#000000' ? r.color : undefined }}
                                        >
                                            {r.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Joined</h4>
                                <p className="text-sm">{new Date(selectedMember.joinedAt).toLocaleDateString()}</p>
                            </div>

                            {(selectedMember.activities && selectedMember.activities.length > 0) && (
                                <div className="space-y-2">
                                    <div className="space-y-1">
                                        {selectedMember.activities.map((act: Activity, i: number) => (
                                            <div key={i} className="text-sm flex items-center gap-2 p-2 bg-muted rounded-md border text-left">
                                                {act.type === 0 && <span className="font-medium text-emerald-500">Playing</span>}
                                                {act.type === 2 && <span className="font-medium text-green-500">Listening to</span>}
                                                {act.type === 3 && <span className="font-medium text-blue-500">Watching</span>}
                                                {act.type === 4 && <span className="font-medium text-gray-500">Custom</span>}
                                                <span className="truncate flex-1">{act.name} {act.details ? `- ${act.details}` : ''} {act.state ? `(${act.state})` : ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Separator />

                            <div className="flex justify-end gap-2">
                                <Button variant="destructive" onClick={() => handleAction('kick')}>
                                    <ShieldAlert className="mr-2 h-4 w-4" /> Kick
                                </Button>
                                <Button variant="outline" className="text-yellow-600 border-yellow-200 hover:bg-yellow-50" onClick={() => handleAction('timeout')}>
                                    <Shield className="mr-2 h-4 w-4" /> Timeout (1h)
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Separator() {
    return <div className="h-[1px] w-full bg-border my-4" />;
}
