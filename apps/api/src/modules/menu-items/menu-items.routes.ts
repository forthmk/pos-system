import type { FastifyInstance } from 'fastify';
import * as controller from './menu-items.controller';
import * as schema from './menu-items.schema';

// Design §8.1: PATCH /api/menu-items/:id/availability — sold out / back in.
async function routes(fastify: FastifyInstance) {
    fastify.patch('/:id/availability', {
        schema: schema.availability,
        preHandler: [fastify.checkPermission('menu.availability')],
        handler: controller.availability,
    });
}

export default routes;
