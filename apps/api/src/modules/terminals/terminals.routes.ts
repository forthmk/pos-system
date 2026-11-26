import type { FastifyInstance } from 'fastify';
import * as controller from './terminals.controller';
import * as schema from './terminals.schema';

// Design §8.1: POST /api/terminals/:id/pair — admin creates the device token
// for a kiosk / KDS. Listing the screens is part of the same admin job.
async function routes(fastify: FastifyInstance) {
    fastify.get('/', { preHandler: [fastify.checkPermission('terminals.manage')], handler: controller.list });

    fastify.post('/:id/pair', {
        schema: schema.pair,
        preHandler: [fastify.checkPermission('terminals.manage')],
        handler: controller.pair,
    });
}

export default routes;
