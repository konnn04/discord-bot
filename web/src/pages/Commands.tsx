import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Search, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Option {
    name: string;
    description: string;
    type?: string;
    required?: boolean;
}

interface Command {
    name: string;
    description: string;
    cooldown?: number;
    options: Option[];
}

export default function Commands() {
    const [commands, setCommands] = useState<Command[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    useEffect(() => {
        const fetchCommands = async () => {
             try {
                 const data = await api.fetch<Command[]>('/commands');
                 setCommands(data);
             } catch (err) {
                 console.error(err);
             } finally {
                 setLoading(false);
             }
        };
        fetchCommands();
    }, []);

    const filteredCommands = commands.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.description.toLowerCase().includes(search.toLowerCase())
    );

    // Paginate
    const totalPages = Math.ceil(filteredCommands.length / itemsPerPage);
    const paginatedCommands = filteredCommands.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Commands</h2>
                    <p className="text-muted-foreground">{commands.length} available commands.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search commands..." 
                        className="pl-8" 
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center p-8 text-muted-foreground">Loading commands...</div>
            ) : (
                <div className="space-y-4">
                     <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Command</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-[100px]">Cooldown</TableHead>
                                    <TableHead>Options</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedCommands.map((cmd) => (
                                    <TableRow key={cmd.name}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Terminal className="h-4 w-4 text-primary" />
                                                <span className="font-mono text-sm">/{cmd.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {cmd.description}
                                        </TableCell>
                                        <TableCell>
                                            {cmd.cooldown ? (
                                                 <Badge variant="secondary" className="text-xs">
                                                    {cmd.cooldown}s
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {cmd.options.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {cmd.options.map(opt => (
                                                        <Badge key={opt.name} variant="outline" className="text-[10px] bg-muted/50">
                                                            {opt.name}{opt.required ? '*' : ''}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs text-italic">No options</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {paginatedCommands.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No commands found.
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
        </div>
    );
}
