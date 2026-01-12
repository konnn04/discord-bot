import { db } from '../database/client';
import { botInfo } from '../database/schema/botInfo';
import { eq } from 'drizzle-orm';

export class BotInfoService {
  static async getRpcStatus() {
    const rpcConfig = await db.select().from(botInfo).where(eq(botInfo.key, 'rpc_status')).limit(1);
    
    if (rpcConfig.length > 0) {
      return rpcConfig[0].value as { text: string; status: string };
    }
    
    // Default
    const defaultStatus = { text: 'Is starting up...', status: 'idle' };
    await this.setRpcStatus(defaultStatus);
    return defaultStatus;
  }

  static async setRpcStatus(status: { text: string; status: string }) {
    // Upsert logic
    const existing = await db.select().from(botInfo).where(eq(botInfo.key, 'rpc_status')).limit(1);
    
    if (existing.length > 0) {
        await db.update(botInfo)
            .set({ value: status, updatedAt: new Date() })
            .where(eq(botInfo.key, 'rpc_status'));
    } else {
        await db.insert(botInfo).values({
            key: 'rpc_status',
            value: status
        });
    }
  }
}
