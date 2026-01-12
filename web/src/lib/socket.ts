import { io, Socket } from 'socket.io-client';

class SocketClient {
    private socket: Socket | null = null;
    private static instance: SocketClient;

    private constructor() {}

    public static getInstance(): SocketClient {
        if (!SocketClient.instance) {
            SocketClient.instance = new SocketClient();
        }
        return SocketClient.instance;
    }

    public connect() {
        if (this.socket?.connected) return;

        this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Connected');
        });

        this.socket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
        });
    }

    public joinGuild(guildId: string) {
        if (!this.socket) this.connect();
        this.socket?.emit('join_guild', guildId);
    }

    public leaveGuild(guildId: string) {
        this.socket?.emit('leave_guild', guildId);
    }

    public on(event: string, callback: (...args: unknown[]) => void) {
        if (!this.socket) this.connect();
        this.socket?.on(event, callback);
    }

    public off(event: string, callback?: (...args: unknown[]) => void) {
        if (callback) {
            this.socket?.off(event, callback);
        } else {
            this.socket?.off(event);
        }
    }
}

export const socket = SocketClient.getInstance();
