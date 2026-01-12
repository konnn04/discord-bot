import { Server, Socket } from 'socket.io';
import { FastifyInstance } from 'fastify';

export class SocketService {
    private static io: Server | null = null;

    static init(io: Server) {
        this.io = io;
        
        io.on('connection', (socket: Socket) => {
            console.log(`[Socket] Client connected: ${socket.id}`);

            socket.on('join_guild', (guildId: string) => {
                socket.join(`guild_${guildId}`);
                console.log(`[Socket] ${socket.id} joined guild_${guildId}`);
            });

            socket.on('leave_guild', (guildId: string) => {
                socket.leave(`guild_${guildId}`);
                console.log(`[Socket] ${socket.id} left guild_${guildId}`);
            });

            socket.on('disconnect', () => {
                console.log(`[Socket] Client disconnected: ${socket.id}`);
            });
        });
    }

    static emitToGuild(guildId: string, event: string, data: any) {
        if (!this.io) {
            console.warn('[Socket] IO not initialized');
            return;
        }
        this.io.to(`guild_${guildId}`).emit(event, data);
    }
}
