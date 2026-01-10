import { Client, ActivityType, PresenceStatusData } from 'discord.js';
import { RPCData, RPCOptions } from '../../shared/types/bot.types';

export class RPC {
  private client: Client;
  private currentData: RPCData | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private options: RPCOptions;

  constructor(client: Client, options: RPCOptions = {}) {
    this.client = client;
    this.options = {
      updateInterval: options.updateInterval || 0,
      afk: options.afk ?? false,
    };
  }

  async setPresence(data: RPCData): Promise<void> {
    if (!this.client.user) {
      throw new Error('Bot is not ready. Wait for ready event.');
    }

    this.currentData = data;

    await this.client.user.setPresence({
      activities: [{
        name: data.name,
        type: data.type ?? ActivityType.Custom,
      }],
      status: data.status ?? 'online',
    });

    console.log(`[INFO] Presence: ${data.name} | Status: ${data.status ?? 'online'}`);
  }

  async setText(text: string, status: PresenceStatusData = 'online'): Promise<void> {
    await this.setPresence({
      name: text,
      type: ActivityType.Custom,
      status,
    });
  }

  async setStatus(status: PresenceStatusData): Promise<void> {
    if (!this.client.user) {
      throw new Error('Bot is not ready');
    }

    await this.client.user.setPresence({ status });
    console.log(`[INFO] Status: ${status}`);
  }

  startAutoUpdate(dataArray: RPCData[]): void {
    if (this.options.updateInterval === 0) {
      throw new Error('updateInterval must be greater than 0');
    }

    if (dataArray.length === 0) {
      throw new Error('dataArray cannot be empty');
    }

    let index = 0;

    this.updateInterval = setInterval(() => {
      this.setPresence(dataArray[index]);
      index = (index + 1) % dataArray.length;
    }, this.options.updateInterval);

    this.setPresence(dataArray[0]);

    console.log(`[INFO] Auto-update RPC started (${dataArray.length} activities)`);
  }


  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('[INFO] Auto-update RPC stopped');
    }
  }

  async clear(): Promise<void> {
    if (!this.client.user) {
      throw new Error('Bot is not ready');
    }

    await this.client.user.setPresence({
      activities: [],
      status: 'online',
    });

    this.currentData = null;
    console.log('[SUCCESS] RPC cleared');
  }

  getCurrentData(): RPCData | null {
    return this.currentData;
  }
}