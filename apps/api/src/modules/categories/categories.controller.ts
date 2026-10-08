import type { FastifyRequest, FastifyReply } from 'fastify';
import * as service from './categories.service';
import { sendResult } from '../../utils/sendResult';

export async function list(
  req: FastifyRequest<{ Querystring: { page?: number; limit?: number; search?: string } }>,
  reply: FastifyReply,
) {
  const result = await service.list(req.query);
  return sendResult(reply, result);
}

export async function getById(
  req: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply,
) {
  const result = await service.getById(req.params.id);
  return sendResult(reply, result);
}

export async function create(
  req: FastifyRequest<{ Body: { name: string; description?: string } }>,
  reply: FastifyReply,
) {
  const result = await service.create(req.body);
  return reply.status(201).send(result);
}

export async function update(
  req: FastifyRequest<{ Params: { id: number }; Body: { name?: string; description?: string | null } }>,
  reply: FastifyReply,
) {
  const result = await service.update(req.params.id, req.body);
  return sendResult(reply, result);
}

export async function remove(
  req: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply,
) {
  await service.remove(req.params.id);
  return reply.status(204).send();
}
