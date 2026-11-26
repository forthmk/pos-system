import type { FastifyInstance } from 'fastify';
import * as controller from './auth.controller';
import * as schema from './auth.schema';

// Design §8.1: POST /api/auth/pin-login (POS, KDS — anyone may call it).
// /device and /me keep kiosk / KDS screens and staff signed in (design §2.2 note).
async function routes(fastify: FastifyInstance) {
    fastify.post('/pin-login', { schema: schema.pinLogin, handler: controller.pinLogin });

    fastify.post('/device', { schema: schema.device, handler: controller.device });

    fastify.get('/me', { preHandler: [fastify.authenticate], handler: controller.me });
}

export default routes;
