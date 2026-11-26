import type { FastifyInstance } from 'fastify';
import * as controller from './kiosk.controller';
import * as schema from './kiosk.schema';

// The self-service kiosk's API (design §5.1, §7.2–7.3, §8.1):
//   GET  /api/kiosk/menu?lang=en|zh|ko   the whole menu in one call
//   POST /api/kiosk/orders               place an order (a paired kiosk only)
//   GET  /api/kiosk/orders/:id           the order, for the Order Sent screen
//   POST /api/kiosk/orders/:id/slip-printed   the order slip was printed
// The Orders board and online payment are added in QB-008.
async function routes(fastify: FastifyInstance) {
    fastify.get('/menu', { schema: schema.menu, preHandler: [fastify.checkPermission('menu.view')], handler: controller.menu });
    fastify.post('/orders', { schema: schema.placeOrder, preHandler: [fastify.checkPermission('orders.create')], handler: controller.placeOrder });
    fastify.get('/orders/:id', { schema: schema.order, preHandler: [fastify.checkPermission('orders.create')], handler: controller.order });
    fastify.post('/orders/:id/slip-printed', { schema: schema.order, preHandler: [fastify.checkPermission('orders.create')], handler: controller.slipPrinted });
}

export default routes;
