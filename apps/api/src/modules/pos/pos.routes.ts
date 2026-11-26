import type { FastifyInstance } from 'fastify';
import * as controller from './pos.controller';
import * as schema from './pos.schema';

// The cashier register's API (design §5.3–5.4, §5.10, §8.1):
//   GET   /api/pos/menu                          menu with SKU codes
//   PATCH /api/pos/menu-items/:id/availability   sold out / back in
//   PATCH /api/pos/addons/:id/availability       an extra sold out / back in
//   GET   /api/pos/scan/:code                    a scanned kiosk slip → the order, locked here
//   POST  /api/pos/orders/:id/release            unlock it (CLEAR / Next Customer)
// Walk-in orders, settle, shifts and reports are added in QB-007 onwards.
async function routes(fastify: FastifyInstance) {
    fastify.get('/menu', { preHandler: [fastify.checkPermission('menu.view')], handler: controller.menu });

    const availability = { schema: schema.availability, preHandler: [fastify.checkPermission('menu.availability')] };
    fastify.patch('/menu-items/:id/availability', { ...availability, handler: controller.itemAvailability });
    fastify.patch('/addons/:id/availability', { ...availability, handler: controller.addonAvailability });

    fastify.get('/scan/:code', { schema: schema.scan, preHandler: [fastify.checkPermission('orders.settle')], handler: controller.scan });
    fastify.post('/orders/:id/release', { schema: schema.release, preHandler: [fastify.checkPermission('orders.settle')], handler: controller.release });
}

export default routes;
