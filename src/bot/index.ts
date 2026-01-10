import { Client, GatewayIntentBits, Collection } from "discord.js";
import { config } from "../config/env";
import { loadCommands } from "./commands";
import { loadEvents } from "./events";
import { RPC } from "./utils/RPC";
import { BotClient } from "./types/bot.types";
import { MeetingTracker } from "./utils/MeetingTracker";

export async function startBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates, 
    ],
  }) as BotClient;

  client.rpc = new RPC(client);
  client.meetingTracker = new MeetingTracker(client);

  client.actionCommands = new Collection();
  client.slashCommands = new Collection();
  client.cooldowns = new Collection();


  await loadCommands(client);
  await loadEvents(client);

  await client.login(config.discord.token);

  return client;
}
