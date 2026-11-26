import type { FastifyInstance } from 'fastify';
import * as controller from './kiosk.controller';
import * as schema from './kiosk.schema';

// The self-service kiosk's API (design §5.1, §8.1):
//   GET /api/kiosk/menu?lang=en|zh|ko   the whole menu in one call
// Placing orders, order status and the Orders board are added in QB-005 / QB-008.
async function routes(fastify: FastifyInstance) {
    fastify.get('/menu', { schema: schema.menu, preHandler: [fastify.checkPermission('menu.view')], handler: controller.menu });
}

export default routes;
