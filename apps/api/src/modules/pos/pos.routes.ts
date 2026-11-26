import type { FastifyInstance } from 'fastify';
import * as controller from './pos.controller';
import * as schema from './pos.schema';

// The cashier register's API (design §5.3–5.4, §5.7, §5.10, §8.1) — see README.md.
async function routes(fastify: FastifyInstance) {
    const can = fastify.checkPermission;

    fastify.get('/menu', { preHandler: [can('menu.view')], handler: controller.menu });
    fastify.patch('/menu-items/:id/availability', { schema: schema.availability, preHandler: [can('menu.availability')], handler: controller.itemAvailability });
    fastify.patch('/addons/:id/availability', { schema: schema.availability, preHandler: [can('menu.availability')], handler: controller.addonAvailability });

    fastify.get('/shifts/current', { preHandler: [can('shifts.use')], handler: controller.currentShift });
    fastify.post('/shifts/open', { schema: schema.openShift, preHandler: [can('shifts.use')], handler: controller.openShift });

    fastify.get('/discount-types', { preHandler: [can('orders.create')], handler: controller.discountTypes });
    fastify.post('/vouchers/validate', { schema: schema.voucher, preHandler: [can('orders.create')], handler: controller.checkVoucher });
    fastify.get('/next-number', { preHandler: [can('orders.create')], handler: controller.nextNumber });

    fastify.get('/orders', { schema: schema.queue, preHandler: [can('orders.settle')], handler: controller.kioskQueue });
    fastify.post('/orders', { schema: schema.placeOrder, preHandler: [can('orders.create')], handler: controller.placeOrder });
    fastify.post('/orders/:id/settle', { schema: schema.settle, preHandler: [can('orders.settle')], handler: controller.settle });
    fastify.post('/orders/:id/cancel', { schema: schema.byId, preHandler: [can('orders.cancel')], handler: controller.cancel });
    fastify.post('/orders/:id/release', { schema: schema.byId, preHandler: [can('orders.settle')], handler: controller.release });

    fastify.get('/scan/:code', { schema: schema.scan, preHandler: [can('orders.settle')], handler: controller.scan });
}

export default routes;
