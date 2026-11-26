import type { AvailabilityBody } from '@pos-system/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendResult } from '../../utils/sendResult';
import * as service from './pos.service';

type AvailabilityRequest = FastifyRequest<{ Params: { id: number }; Body: AvailabilityBody }>;

// GET /pos/menu
export async function menu(request: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await service.readMenu(request.principal!.store_id));
}

// PATCH /pos/menu-items/:id/availability
export async function itemAvailability(request: AvailabilityRequest, reply: FastifyReply) {
    return sendResult(reply, await service.setItemAvailability(request.params.id, request.principal!.store_id, request.body.is_available));
}

// PATCH /pos/addons/:id/availability
export async function addonAvailability(request: AvailabilityRequest, reply: FastifyReply) {
    return sendResult(reply, await service.setAddonAvailability(request.params.id, request.principal!.store_id, request.body.is_available));
}

// GET /pos/scan/:code
export async function scan(request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) {
    return sendResult(reply, await service.scan(request.principal!, request.params.code));
}

// POST /pos/orders/:id/release
export async function release(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    return sendResult(reply, await service.release(request.principal!, request.params.id));
}
