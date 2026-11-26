import type { FastifyInstance } from 'fastify';
import { join } from '../../pipeline/live';
import { resolvePrincipal } from '../auth/auth.service';
import type { TokenPayload } from '../../types/fastify';

// GET /api/live?token=<JWT> — the live feed (design §8.2, pipeline/live.ts).
// Browsers can't send headers on a WebSocket, so the sign-in token comes in
// the query; it is checked like any request (resolvePrincipal), and the
// socket joins its store. 4401 = sign in again.
async function routes(fastify: FastifyInstance) {
    fastify.get('/', { websocket: true }, async (socket, request) => {
        const token = (request.query as { token?: string }).token ?? '';
        let storeId: number;
        try {
            storeId = (await resolvePrincipal(fastify.jwt.verify<TokenPayload>(token))).store_id;
        } catch {
            socket.close(4401, 'Please sign in again.');
            return;
        }
        const leave = join(socket, storeId);
        // Keep idle connections alive through proxies / Wi-Fi sleep.
        const ping = setInterval(() => socket.ping(), 25_000);
        socket.on('close', () => {
            clearInterval(ping);
            leave();
        });
        socket.send(JSON.stringify({ event: 'live.ready', data: {}, server_time: new Date().toISOString() }));
    });
}

export default routes;
