import type { FastifyInstance } from 'fastify';
import * as controller from './kiosk.controller';
import * as schema from './kiosk.schema';

// Design §8.1: GET /api/kiosk/menu?lang=en — the kiosk (and staff) read the
// whole menu in one call.
async function routes(fastify: FastifyInstance) {
    fastify.get('/menu', { schema: schema.menu, preHandler: [fastify.checkPermission('menu.view')], handler: controller.menu });
}

export default routes;
