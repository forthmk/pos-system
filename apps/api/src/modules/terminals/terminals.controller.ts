import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendResult } from '../../utils/sendResult';
import * as service from './terminals.service';

// GET /terminals — the store's screens (no token hashes).
export async function list(request: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await service.list(request.principal!.store_id));
}

// POST /terminals/:id/pair — new device token for a kiosk / KDS, shown once.
export async function pair(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    return sendResult(reply, await service.pair(request.params.id, request.principal!.store_id), 201);
}
