import type { KioskMenuQuery } from '@pos-system/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendResult } from '../../utils/sendResult';
import * as service from './kiosk.service';

// GET /kiosk/menu?lang=en
export async function menu(request: FastifyRequest<{ Querystring: KioskMenuQuery }>, reply: FastifyReply) {
    return sendResult(reply, await service.menu(request.principal!.store_id, request.query.lang ?? 'en'));
}
