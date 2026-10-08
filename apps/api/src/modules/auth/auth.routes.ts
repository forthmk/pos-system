import type { FastifyInstance } from 'fastify';
import * as controller from './auth.controller';
import * as schema from './auth.schema';

async function routes(fastify: FastifyInstance) {
  fastify.post('/login', { schema: schema.login, handler: controller.login });

  fastify.get('/me', {
    preHandler: [fastify.authenticate!],
    handler: controller.me,
  });
}

export default routes;
