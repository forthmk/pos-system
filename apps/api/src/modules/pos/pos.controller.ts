import type { AvailabilityBody, CloseShiftBody, OpenShiftBody, PosOrderBody, SettleBody, VoidOrderBody, VoucherCheckBody } from '@pos-system/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendResult } from '../../utils/sendResult';
import * as service from './pos.service';

type ById = FastifyRequest<{ Params: { id: number } }>;
type AvailabilityRequest = FastifyRequest<{ Params: { id: number }; Body: AvailabilityBody }>;

// GET /pos/menu
export async function menu(request: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await service.readMenu(request.principal!.store_id));
}

// PATCH /pos/menu-items/:id/availability · /pos/addons/:id/availability
export async function itemAvailability(request: AvailabilityRequest, reply: FastifyReply) {
    return sendResult(reply, await service.setItemAvailability(request.params.id, request.principal!.store_id, request.body.is_available));
}
export async function addonAvailability(request: AvailabilityRequest, reply: FastifyReply) {
    return sendResult(reply, await service.setAddonAvailability(request.params.id, request.principal!.store_id, request.body.is_available));
}

// GET /pos/shifts/current · POST /pos/shifts/open
export async function currentShift(request: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await service.currentShift(request.principal!));
}
export async function openShift(request: FastifyRequest<{ Body: OpenShiftBody }>, reply: FastifyReply) {
    return sendResult(reply, await service.openShift(request.principal!, request.body), 201);
}

// GET /pos/discount-types · POST /pos/vouchers/validate · GET /pos/next-number
export async function discountTypes(request: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await service.discountTypes(request.principal!));
}
export async function checkVoucher(request: FastifyRequest<{ Body: VoucherCheckBody }>, reply: FastifyReply) {
    return sendResult(reply, await service.checkVoucher(request.principal!, request.body.code, request.body.subtotal));
}
export async function nextNumber(request: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await service.nextNumber(request.principal!));
}

// GET /pos/orders?status=awaiting_payment — the Kiosk # list
export async function kioskQueue(request: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await service.kioskQueue(request.principal!));
}

// POST /pos/orders — 201 new, 200 the same client_ref again
export async function placeOrder(request: FastifyRequest<{ Body: PosOrderBody }>, reply: FastifyReply) {
    const { order, created } = await service.placeOrder(request.principal!, request.body);
    return sendResult(reply, order, created ? 201 : 200);
}

// POST /pos/orders/:id/settle · /cancel · /release
export async function settle(request: FastifyRequest<{ Params: { id: number }; Body: SettleBody }>, reply: FastifyReply) {
    return sendResult(reply, await service.settle(request.principal!, request.params.id, request.body));
}
export async function cancel(request: ById, reply: FastifyReply) {
    return sendResult(reply, await service.cancel(request.principal!, request.params.id));
}
export async function release(request: ById, reply: FastifyReply) {
    return sendResult(reply, await service.release(request.principal!, request.params.id));
}

// GET /pos/scan/:code
export async function scan(request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) {
    return sendResult(reply, await service.scan(request.principal!, request.params.code));
}

// GET /pos/shifts — recent shifts (the report's shift picker)
export async function listShifts(request: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await service.listShifts(request.principal!));
}

// POST /pos/shifts/:id/close — counted cash → Z-reading
export async function closeShift(request: FastifyRequest<{ Params: { id: number }; Body: CloseShiftBody }>, reply: FastifyReply) {
    return sendResult(reply, await service.closeShift(request.principal!, request.params.id, request.body));
}

// GET /pos/reports/shift/:id
export async function shiftReport(request: ById, reply: FastifyReply) {
    return sendResult(reply, await service.shiftReport(request.principal!, request.params.id));
}

// GET /pos/reports/shift/:id/export.csv — Export CSV / Z-Read (a download)
export async function shiftCsv(request: ById, reply: FastifyReply) {
    const { filename, csv } = await service.shiftCsv(request.principal!, request.params.id);
    return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send('\uFEFF' + csv); // BOM: Excel opens ₱ / names correctly
}

// POST /pos/orders/:id/void — manager username + PIN, reason
export async function voidOrder(request: FastifyRequest<{ Params: { id: number }; Body: VoidOrderBody }>, reply: FastifyReply) {
    return sendResult(reply, await service.voidOrder(request.principal!, request.params.id, request.body));
}
