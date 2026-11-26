import type { FastifyInstance } from 'fastify';
import * as controller from './kds.controller';
import * as schema from './kds.schema';

// The kitchen display's API (design §5.5–5.6, §7.8, §8.1) — see README.md.
async function routes(fastify: FastifyInstance) {
    const can = fastify.checkPermission;

    fastify.get('/tickets', { schema: schema.tickets, preHandler: [can('kds.use')], handler: controller.tickets });
    fastify.post('/orders/:id/complete', { schema: schema.byId, preHandler: [can('kds.use')], handler: controller.complete });
    fastify.post('/orders/:id/recall', { schema: schema.byId, preHandler: [can('kds.use')], handler: controller.recall });
    fastify.post('/clear-served', { preHandler: [can('kds.use')], handler: controller.clearServed });
}

export default routes;
