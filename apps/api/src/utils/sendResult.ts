import { FastifyReply } from 'fastify';

/**
 * BigInt-safe JSON response helper.
 * MySQL can return BigInt for AUTO_INCREMENT columns on Node 24+;
 * JSON.stringify throws on BigInt, so we serialise via replacer.
 */
export function sendResult(reply: FastifyReply, data: unknown, statusCode = 200) {
  const serialised = JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === 'bigint' ? Number(value) : value,
    ),
  );
  return reply.status(statusCode).send(serialised);
}
