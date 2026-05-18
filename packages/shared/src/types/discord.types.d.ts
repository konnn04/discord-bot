export declare enum PermissionLevel {
    EVERYONE = 0,
    MODERATOR = 1,
    ADMIN = 2,
    GUILD_OWNER = 3,
    SUPER_ADMIN = 4
}
export type OptionType = 'string' | 'integer' | 'boolean' | 'user' | 'channel' | 'role' | 'number' | 'attachment';
export interface OptionCommand {
    name: string;
    description: string;
    type?: 'BOOLEAN' | 'USER' | 'ROLE' | 'ATTACHMENT' | 'MENTIONABLE' | 'NUMBER' | 'STRING' | 'INTEGER' | 'CHANNEL';
    maxLength?: number;
    minLength?: number;
    maxValue?: number;
    minValue?: number;
    required?: boolean;
    isDefaultOption?: boolean;
    choices?: {
        name: string;
        value: string | number;
    }[];
    autocomplete?: boolean;
    channelTypes?: number[];
}
export interface ActionCommand {
    name: string;
    description: string;
    helpDescription?: string;
    category: string;
    permission?: PermissionLevel;
    isOnlySlashCommand?: boolean;
    optionalArgs?: OptionCommand[];
    subcommands?: ActionCommand[];
    cooldown?: number;
    execute: (ctx: any, deps?: any) => Promise<void>;
    autocomplete?: (ctx: any, deps?: any) => Promise<void>;
}
export interface EventHandler {
    name: string;
    once?: boolean;
    execute: (...args: any[]) => void | Promise<void>;
}
export interface RPCData {
    name: string;
    type?: number;
    url?: string;
    status?: string;
    details?: string;
    state?: string;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    startTimestamp?: number;
    endTimestamp?: number;
}
export interface RPCOptions {
    updateInterval?: number;
    afk?: boolean;
}
