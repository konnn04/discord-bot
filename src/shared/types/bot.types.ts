import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { ActivityType, PresenceStatusData } from 'discord.js';

export interface CommandData {
  name: string;
  description: string;
  options?: any[];
}

export interface EventData {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => void | Promise<void>;
}

export interface RPCData {
  name: string;
  type?: ActivityType;
  url?: string;
  status?: PresenceStatusData;
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
  choices?: { name: string; value: string | number }[];
  autocomplete?: boolean; 
  channelTypes?: number[]; 
}

export interface ActionCommand {
  name: string;
  description: string;
  helpDescription?: string;
  isOnlySlashCommand?: boolean;
  optionalArgs?: OptionCommand[];
  cooldown?: number; 
  execute: (ctx: any|ContextAdapter, args?: { [key: string]: any }) => Promise<void>;
}