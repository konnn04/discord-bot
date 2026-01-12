import { db } from '../database/client';
import { apiClients } from '../database/schema/apiClients';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export class ApiClientService {
  static async validateClient(clientId: string, clientSecret: string) {
    const client = await db.query.apiClients.findFirst({
        where: eq(apiClients.clientId, clientId)
    });

    if (!client) return null;

    // TODO: Use hashed secret in production. For now comparing plaintext if stored plaintext, 
    // or assume simple comparison. Ideally we use bcrypt/argon2.
    // Given the request, we'll keep it simple first but note the security implication.
    if (client.clientSecret !== clientSecret) return null;

    return client;
  }

  static async createClient(name: string, permissions: string[] = []) {
      const clientId = crypto.randomBytes(16).toString('hex');
      const clientSecret = crypto.randomBytes(32).toString('hex');

      await db.insert(apiClients).values({
          name,
          clientId,
          clientSecret, 
          permissions
      });

      return { clientId, clientSecret };
  }
}
