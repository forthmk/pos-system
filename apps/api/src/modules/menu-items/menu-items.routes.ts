import type { FastifyInstance } from 'fastify';
import * as controller from './menu-items.controller';
import * as schema from './menu-items.schema';

async function routes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate!);

  fastify.get('/', { schema: schema.list, handler: controller.list });
  fastify.get('/:id', { schema: schema.getById, handler: controller.getById });
  fastify.post('/', { schema: schema.create, handler: controller.create });
  fastify.put('/:id', { schema: schema.update, handler: controller.update });
  fastify.delete('/:id', { schema: schema.remove, handler: controller.remove });
}

export default routes;
