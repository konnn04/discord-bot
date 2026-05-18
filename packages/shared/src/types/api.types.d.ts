export interface GuildInfo {
    id: string;
    name: string;
    icon: string | null;
    memberCount: number;
    isManageable: boolean;
}
export interface UserInfo {
    id: string;
    username: string;
    avatar: string | null;
    guilds: GuildInfo[];
}
export interface AuthTokenPayload {
    sub: string;
    username: string;
    avatar: string | null;
    accessToken: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
