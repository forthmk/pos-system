import type { KioskMenuQuery, PlaceKioskOrderBody } from '@pos-system/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendResult } from '../../utils/sendResult';
import * as service from './kiosk.service';

// GET /kiosk/menu?lang=en
export async function menu(request: FastifyRequest<{ Querystring: KioskMenuQuery }>, reply: FastifyReply) {
    return sendResult(reply, await service.readMenu(request.principal!.store_id, request.query.lang ?? 'en'));
}

// POST /kiosk/orders — 201 new order, 200 the same order again (retried tap).
export async function placeOrder(request: FastifyRequest<{ Body: PlaceKioskOrderBody }>, reply: FastifyReply) {
    const { order, created } = await service.placeOrder(request.principal!, request.body);
    return sendResult(reply, order, created ? 201 : 200);
}

// POST /kiosk/orders/:id/slip-printed
export async function slipPrinted(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    return sendResult(reply, await service.markSlipPrinted(request.principal!, request.params.id));
}

// GET /kiosk/board — Preparing / Ready numbers (design §5.6)
export async function board(request: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await service.board(request.principal!.store_id));
}

// GET /kiosk/orders/:id
export async function order(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    return sendResult(reply, await service.getOrder(request.principal!, request.params.id));
}
