import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import { checkDatabaseConnection, setDbLogger } from './services/database.service';
import ApiError from './apiError';
import authentication from './middleware/authentication';

// ─── Module registry ───────────────────────────────────────────────────────────
// Add each module name here as it is built. The entry mounts the module's
// routes.js at /api/<name> and is the sole registry of active modules.
// auth = who is using the system; kiosk / pos / kds = the three screens, joined by src/pipeline/.
const routes: string[] = ['auth', 'kiosk', 'pos'];

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'dev' ? 'info' : 'warn',
      transport:
        process.env.NODE_ENV === 'dev'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // ── Plugins ──────────────────────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(sensible);

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-prod',
  });

  // ── Wire DB logger to Fastify logger ─────────────────────────────────────────
  setDbLogger({
    info: (obj, msg) => fastify.log.info(obj, msg),
    error: (obj, msg) => fastify.log.error(obj, msg),
  });

  // ── Dev: auto-inject admin JWT when absent ───────────────────────────────────
  // Signs in as seeded user 1 (admin). It is still re-read from the DB like any
  // other token, so a dev DB without that user gets a 401, not a fake admin.
  if (process.env.NODE_ENV === 'dev') {
    fastify.addHook('onRequest', async (request) => {
      if (!request.headers.authorization) {
        const token = fastify.jwt.sign({ kind: 'staff', sub: 1, store_id: 1, role: 'admin', terminal_id: null });
        request.headers.authorization = `Bearer ${token}`;
      }
    });
  }

  // ── Auth: fastify.authenticate / fastify.checkPermission(permission) ─────────
  await fastify.register(authentication);

  // ── Global error handler ──────────────────────────────────────────────────────
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode ?? 500).send({
        error: error.message,
        field: error.field ?? undefined,
        // e.g. { code: 'ITEM_UNAVAILABLE', items } or { code: 'TOTAL_CHANGED', total_due }
        details: error.value ?? undefined,
      });
    }
    // Schema validation (TypeBox) and other client errors keep their 4xx.
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  });

  // ── Health check ──────────────────────────────────────────────────────────────
  fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  // ── Mount modules ─────────────────────────────────────────────────────────────
  for (const name of routes) {
    const mod = await import(`./modules/${name}/${name}.routes.js`);
    await fastify.register(mod.default, { prefix: `/api/${name}` });
  }

  return fastify;
}
