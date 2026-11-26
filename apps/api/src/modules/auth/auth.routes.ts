import type { FastifyInstance } from 'fastify';
import * as controller from './auth.controller';
import * as schema from './auth.schema';

// Who is using the system (design §2.2, §8.1):
//   POST /api/auth/pin-login            staff: username + PIN at a terminal
//   POST /api/auth/device               paired kiosk / KDS screen signs itself in
//   GET  /api/auth/me                   who am I now (+ fresh token)
//   GET  /api/auth/terminals            admin: the store's screens
//   POST /api/auth/terminals/:id/pair   admin: device token for a kiosk / KDS
async function routes(fastify: FastifyInstance) {
    fastify.post('/pin-login', { schema: schema.pinLogin, handler: controller.pinLogin });
    fastify.post('/device', { schema: schema.device, handler: controller.device });
    fastify.get('/me', { preHandler: [fastify.authenticate], handler: controller.me });

    fastify.get('/terminals', { preHandler: [fastify.checkPermission('terminals.manage')], handler: controller.listTerminals });
    fastify.post('/terminals/:id/pair', {
        schema: schema.pair,
        preHandler: [fastify.checkPermission('terminals.manage')],
        handler: controller.pairTerminal,
    });
}

export default routes;
