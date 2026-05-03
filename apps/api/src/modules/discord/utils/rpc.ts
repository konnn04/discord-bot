import { Client, ActivityType, PresenceStatusData } from 'discord.js';
import type { RPCData, RPCOptions } from 'shared/src/types/discord.types';

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

  setPresence(data: RPCData): void {
    if (!this.client.user) {
      throw new Error('Bot is not ready. Wait for ready event.');
    }

    this.currentData = data;

    this.client.user.setPresence({
      activities: [
        {
          name: data.name,
          type: data.type ?? ActivityType.Custom,
        },
      ],
      status: (data.status as PresenceStatusData) ?? 'online',
    });
  }

  setText(text: string, status: PresenceStatusData = 'online'): void {
    this.setPresence({
      name: text,
      type: ActivityType.Custom,
      status,
    });
  }

  setStatus(status: PresenceStatusData): void {
    if (!this.client.user) {
      throw new Error('Bot is not ready');
    }
    this.client.user.setPresence({ status });
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
  }

  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  clear(): void {
    if (!this.client.user) {
      throw new Error('Bot is not ready');
    }
    this.client.user.setPresence({
      activities: [],
      status: 'online',
    });
    this.currentData = null;
  }

  getCurrentData(): RPCData | null {
    return this.currentData;
  }
}
