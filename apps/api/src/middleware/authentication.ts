import fp from 'fastify-plugin';
import { can, type Actor, type Permission } from '@pos-system/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import ApiError from '../apiError';
import { resolvePrincipal } from '../modules/auth/auth.service';
import type { Principal } from '../types/fastify';

// Route guards (design §2.2, roles table in @pos-system/shared/utils/permissions):
//
//   preHandler: [fastify.authenticate]                       any signed-in user / screen
//   preHandler: [fastify.checkPermission('orders.void')]     + that role / screen may do it
//
// Like the commissary's checkPermission, the caller is re-read from the DB on
// every request (resolvePrincipal), so switching a user off or re-pairing a
// screen takes effect immediately. Errors go through the global handler:
// 401 = sign in again, 403 = signed in but not allowed.

export const actorOf = (principal: Principal): Actor => (principal.kind === 'staff' ? principal.role : principal.type);

async function verify(request: FastifyRequest) {
    try {
        await request.jwtVerify();
    } catch {
        throw new ApiError('Please sign in again.', 401);
    }
    request.principal = await resolvePrincipal(request.user);
}

async function authentication(fastify: FastifyInstance) {
    fastify.decorate('authenticate', async (request: FastifyRequest) => {
        await verify(request);
    });

    fastify.decorate('checkPermission', (permission: Permission) => async (request: FastifyRequest) => {
        await verify(request);
        if (!can(actorOf(request.principal!), permission)) {
            throw new ApiError('You are not allowed to do this.', 403);
        }
    });
}

export default fp(authentication);
