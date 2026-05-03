import { Injectable } from '@nestjs/common';
import { Collection } from 'discord.js';
import { GlobalSettingsService } from '../../settings/global-settings.service';

@Injectable()
export class CooldownService {
  /** Map<commandName, Map<userId, expirationTimestamp>> */
  private readonly cooldowns = new Collection<
    string,
    Collection<string, number>
  >();

  constructor(private globalSettings: GlobalSettingsService) {}

  /**
   * Check if a user is on cooldown for a command.
   * Returns remaining time in seconds, or 0 if not on cooldown.
   */
  check(commandName: string, userId: string, customCooldown?: number): number {
    if (!this.cooldowns.has(commandName)) {
      this.cooldowns.set(commandName, new Collection());
    }

    const timestamps = this.cooldowns.get(commandName)!;
    const cooldownMs =
      customCooldown ?? this.globalSettings.get().bot.defaultCooldown;
    const now = Date.now();

    if (timestamps.has(userId)) {
      const expirationTime = timestamps.get(userId)! + cooldownMs;
      if (now < expirationTime) {
        return (expirationTime - now) / 1000;
      }
    }

    // Set the cooldown
    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownMs);

    return 0;
  }

  /** Clear cooldowns for a specific command or all commands */
  clear(commandName?: string): void {
    if (commandName) {
      this.cooldowns.delete(commandName);
    } else {
      this.cooldowns.clear();
    }
  }
}
