import type { FastifyInstance } from 'fastify';
import * as controller from './addons.controller';
import * as schema from './addons.schema';

// PATCH /api/addons/:id/availability — an extra sold out / back in (decision 19).
async function routes(fastify: FastifyInstance) {
    fastify.patch('/:id/availability', {
        schema: schema.availability,
        preHandler: [fastify.checkPermission('menu.availability')],
        handler: controller.availability,
    });
}

export default routes;
