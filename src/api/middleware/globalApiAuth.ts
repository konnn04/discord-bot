import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ApiClientService } from '../../services/ApiClientService';

export async function globalApiMiddleware(req: FastifyRequest, reply: FastifyReply) {
  
  const clientId = req.headers['client-id'] as string;
  const clientSecret = req.headers['client-secret'] as string;

  if (!clientId || !clientSecret) {
    return reply.status(401).send({ error: 'Missing client credentials' });
  }

  const client = await ApiClientService.validateClient(clientId, clientSecret);

  if (!client) {
    return reply.status(403).send({ error: 'Invalid client credentials' });
  }

  (req as any).apiClient = client;
}
