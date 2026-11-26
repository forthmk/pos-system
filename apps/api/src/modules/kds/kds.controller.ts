import type { KdsQuery } from '@pos-system/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendResult } from '../../utils/sendResult';
import * as service from './kds.service';

// GET /kds/tickets?station=
export async function tickets(request: FastifyRequest<{ Querystring: KdsQuery }>, reply: FastifyReply) {
    return sendResult(reply, await service.tickets(request.principal!, request.query.station));
}

// POST /kds/orders/:id/complete
export async function complete(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    return sendResult(reply, await service.complete(request.principal!, request.params.id));
}

// POST /kds/orders/:id/recall
export async function recall(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    return sendResult(reply, await service.recall(request.principal!, request.params.id));
}

// POST /kds/clear-served
export async function clearServed(request: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await service.clearServed(request.principal!));
}
