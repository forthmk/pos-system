import type { AvailabilityBody } from '@pos-system/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendResult } from '../../utils/sendResult';
import * as service from './menu-items.service';

// PATCH /menu-items/:id/availability
export async function availability(request: FastifyRequest<{ Params: { id: number }; Body: AvailabilityBody }>, reply: FastifyReply) {
    return sendResult(reply, await service.setAvailability(request.params.id, request.principal!.store_id, request.body.is_available));
}
