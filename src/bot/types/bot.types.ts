import { Client, GatewayIntentBits, Collection, SlashCommandBuilder } from 'discord.js';
import { RPC } from '../utils/RPC';
import { ActionCommand } from '@src/shared/types/bot.types';
import { MeetingTracker } from '../utils/MeetingTracker';

export interface BotClient extends Client {
  rpc: RPC;
  actionCommands: Collection<string, ActionCommand>; 
  slashCommands: Collection<string, SlashCommandBuilder>; 
  cooldowns: Collection<string, Collection<string, number>>;
  meetingTracker: MeetingTracker;
  rpsStreaks: Map<string, number>;
  db: any;
}